# 新鼎电炉科技——智能客服系统 Redis缓存设计

## 一、设计概述

### 1.1 缓存分层架构

```
┌─────────────────────────────────────────────────────────┐
│                    L0: 浏览器缓存                         │
│  • localStorage: session_token, 对话草稿                 │
│  • sessionStorage: 临时页面上下文                        │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              L1: Nest.js 应用内存缓存                     │
│  • 系统配置（system_configs 全量缓存）                   │
│  • 管理员权限列表                                        │
│  • 敏感词库                                              │
│  • 缓存策略: 启动时加载 + 定时刷新                       │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               L2: Redis 分布式缓存                        │
│  • 会话管理 (Session)                                    │
│  • RAG检索缓存 (Query→Answer)                            │
│  • 限流计数器 (Rate Limiting)                            │
│  • 对话上下文 (Conversation Context)                     │
│  • 热统计数据 (Hot Stats)                                │
│  • 分布式锁 (Distributed Lock)                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Redis版本与特性

| 特性 | 用途 |
|------|------|
| Redis 7.x | 基础版本 |
| RedisJSON | 结构化存储对话上下文（JSON格式） |
| RediSearch | 可选，未来做缓存内容的关键词检索 |
| RedisTimeSeries | 可选，时序数据存取（看板实时数据） |
| 持久化 | RDB（每15分钟快照） + AOF（每秒fsync）混合持久化 |
| 淘汰策略 | `volatile-lru` — 仅驱逐设置了过期时间的Key，按LRU |

### 1.3 Key命名规范

```
{业务域}:{子域}:{标识符}

示例:
  session:token:sess_abc123
  session:csrf:csrf_abc123
  rag:query:md5hash_xxxx
  rag:doc:doc_uuid_001
  rate:ip:192.168.1.1
  rate:session:sess_abc123
  conv:context:conv_uuid_001
  stats:hot:daily:2026-05-16
  lock:document:doc_uuid_001
```

---

## 二、会话管理缓存

### 2.1 Session Token

```
Key:    session:token:{sessionToken}
类型:   Hash
内容:
  {
    "visitorId": "uuid_visitor_xxx",
    "conversationId": "uuid_conv_xxx",
    "fingerprint": "sha256_hash",
    "ipAddress": "192.168.1.1",
    "createdAt": "2026-05-16T08:30:00.000Z",
    "lastActiveAt": "2026-05-16T09:00:00.000Z"
  }
TTL:    24小时
续期:   每次请求自动续期24小时（EXPIRE重置）
删除:   会话过期或用户主动关闭会话
```

```
Key:    session:csrf:{csrfToken}
类型:   String (关联sessionToken)
内容:   "sess_abc123"
TTL:    24小时（与session同生命周期）
说明:   CSRF Token验证时使用，存储关联的sessionToken
```

### 2.2 浏览器指纹→访客映射

```
Key:    visitor:fingerprint:{fingerprintHash}
类型:   String
内容:   "uuid_visitor_xxx"
TTL:    7天（最后一次访问后）
说明:   用于将同一浏览器指纹关联到已存在的visitor记录
```

---

## 三、RAG检索缓存

### 3.1 设计思路

RAG检索是系统最大的性能瓶颈和成本来源：
- 向量检索（Milvus）耗时约200-500ms
- LLM生成（DeepSeek）耗时约2-8秒
- Token计费（每次生成成本约0.01-0.05元）

高频问题的重复检索是巨大浪费。RAG缓存的核心目标：
1. **减少重复检索**：相同/相似问题直接返回缓存答案
2. **降低Token费用**：缓存命中时零Token消耗
3. **提升响应速度**：缓存命中<10ms，vs 2-8秒正常生成

### 3.2 问题→答案缓存

```
Key:    rag:answer:{questionHash}
类型:   Hash
Hash内容:
  {
    "question": "800公斤钢料用多大功率的中频炉？",
    "answer": "根据选型公式，800公斤钢料建议使用320-400KW...",
    "intent": "product_inquiry",
    "confidenceScore": 0.92,
    "retrievalSources": "[{...}]",        // JSON序列化的检索来源
    "tokensUsed": 380,
    "hitCount": 15,                       // 缓存命中次数（用于热问统计）
    "createdAt": "2026-05-16T08:30:00.000Z",
    "lastHitAt": "2026-05-16T15:00:00.000Z"
  }
TTL:    24小时（每次命中自动续期12小时，最多续期至72小时）
淘汰:   volatile-lru 自动淘汰低频缓存
```

**问题Hash生成策略**:
```typescript
function generateQuestionHash(question: string): string {
  // 1. 文本标准化：去空格、全角转半角、统一小写
  const normalized = question
    .trim()
    .replace(/\s+/g, '')
    .replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .toLowerCase();

  // 2. MD5 hash
  return crypto.createHash('md5').update(normalized).digest('hex');
}
```

**缓存命中策略**:
```
1. 精确匹配：问题Hash完全匹配 → 直接返回缓存
2. 语义相似匹配（可选，第二期）：
   - 对问题进行向量化
   - 在Redis中维护高频问题向量索引（RediSearch）
   - 查询相似度>0.95视为命中
   - 注意：语义匹配需要Embedding调用，本身有成本，需权衡
```

### 3.3 文档→缓存映射（按文档粒度失效）

```
Key:    rag:doc_cache:{documentId}
类型:   Set (存储该文档关联的所有questionHash)
内容:   { "md5hash_001", "md5hash_002", "md5hash_003" }
TTL:    不设过期时间（随文档生命周期管理）

失效流程:
  1. 文档更新 → 查询 rag:doc_cache:{documentId}
  2. 获取所有关联的 questionHash
  3. 批量删除 rag:answer:{hash} 对应的缓存
  4. 删除 rag:doc_cache:{documentId}
  5. 新文档处理完成后，重新建立缓存映射
```

```typescript
// 缓存写入时记录映射
async function cacheAnswer(questionHash: string, documentIds: string[], answer: any) {
  const pipeline = redis.pipeline();

  // 写入答案缓存
  pipeline.hset(`rag:answer:${questionHash}`, answer);

  // 写入文档→缓存映射
  for (const docId of documentIds) {
    pipeline.sadd(`rag:doc_cache:${docId}`, questionHash);
  }

  await pipeline.exec();
}

// 文档更新时精确失效
async function invalidateDocumentCache(documentId: string) {
  const questionHashes = await redis.smembers(`rag:doc_cache:${documentId}`);

  if (questionHashes.length > 0) {
    const pipeline = redis.pipeline();
    for (const hash of questionHashes) {
      pipeline.del(`rag:answer:${hash}`);
    }
    pipeline.del(`rag:doc_cache:${documentId}`);
    await pipeline.exec();
  }
}
```

### 3.4 检索片段缓存

```
Key:    rag:chunk:{questionHash}
类型:   String (JSON)
内容:   [{ chunkId, documentTitle, content, score }, ...]
TTL:    24小时
说明:   缓存纯检索结果（不含LLM生成），当仅检索结果命中但答案缓存未命中时，
        跳过Milvus检索，直接进入LLM生成阶段
```

---

## 四、限流计数器

### 4.1 滑动窗口限流（Sliding Window）

使用Redis实现滑动窗口限流算法，替代固定窗口的"突刺"问题。

```typescript
// 滑动窗口限流实现
async function slidingWindowRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}:${Math.random()}`;

  const pipeline = redis.pipeline();
  // 1. 添加当前请求时间戳
  pipeline.zadd(key, now, member);
  // 2. 移除窗口外的记录
  pipeline.zremrangebyscore(key, 0, windowStart);
  // 3. 统计窗口内请求数
  pipeline.zcard(key);
  // 4. 设置Key过期时间
  pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

  const [, , count] = await pipeline.exec();
  const requestCount = count as number;

  return {
    allowed: requestCount <= maxRequests,
    remaining: Math.max(0, maxRequests - requestCount),
    resetTime: now + windowMs
  };
}
```

### 4.2 各端点限流Key配置

| 端点 | Key Pattern | 窗口 | 上限 | 说明 |
|------|-------------|------|------|------|
| 创建会话 | `rate:session_create:{ip}` | 60s | 10 | 防刷会话 |
| 发送消息 | `rate:message:{sessionToken}` | 60s | 20 | 单会话限速 |
| SSE连接 | `rate:sse:{sessionToken}` | — | 1 | 并发连接数（计数器） |
| 管理员登录 | `rate:login:{ip}` | 60s | 5 | 防暴力破解 |
| 管理后台全局 | `rate:admin:{userId}` | 60s | 60 | 全局API限流 |
| DeepSeek API | `rate:deepseek:global` | 60s | 20 | 控制Token费用 |

### 4.3 IP黑名单缓存

```
Key:    rate:blacklist:{ip}
类型:   String
内容:   "blocked" 或 "warning"
TTL:    封禁时间（如3600秒=1小时）

触发条件:
  - 1分钟内 session_create 超过 30次 → warning (10分钟)
  - 1分钟内 任意接口 超过 100次 → blocked (1小时)
  - 手动添加 → blocked (永久，TTL=-1)
```

---

## 五、对话上下文缓存

### 5.1 上下文存储

```
Key:    conv:context:{conversationId}
类型:   JSON (使用RedisJSON模块)
内容:
  {
    "conversationId": "uuid_conv_xxx",
    "summary": "用户咨询800kg钢料的IGBT中频炉选型...",  // AI生成的摘要
    "summaryGeneratedAt": "2026-05-16T08:35:00.000Z",
    "slidingWindow": [                                 // 最近N轮完整对话
      {
        "role": "user",
        "content": "800公斤钢料用多大功率的中频炉？",
        "timestamp": "2026-05-16T08:30:00.000Z"
      },
      {
        "role": "assistant",
        "content": "根据选型公式...",
        "timestamp": "2026-05-16T08:30:15.000Z"
      },
      ...
    ],
    "extractedSlots": {                               // 槽位提取结果
      "materialType": "钢料",
      "weight": "800kg",
      "powerRecommendation": "320-400KW"
    },
    "intentHistory": [                                // 意图变化历史
      { "intent": "product_inquiry", "changedAt": "..." }
    ],
    "totalTokensUsed": 2500,                          // 累计Token消耗
    "updatedAt": "2026-05-16T08:35:00.000Z"
  }
TTL:    30分钟（会话空闲超时后自动清除）
续期:   每次发送消息时续期30分钟
```

### 5.2 摘要生成触发条件

```
智能摘要策略：
1. slidingWindow 长度 ≥ 滑动窗口大小 (默认10轮) + 2 → 触发摘要生成
2. 取最早的5轮对话 + 当前摘要 → 调用DeepSeek生成新摘要（低成本轻量调用）
3. slidingWindow 保持最新10轮完整对话
4. 向Dify发送的上下文 = 摘要 + 滑动窗口内的完整对话

Token预算控制：
- 单次对话最大Token: 4096
- 摘要估算Token: ~200
- 10轮对话估算Token: ~2000
- 总计约2200 < 4096，安全余量充足
```

### 5.3 并发对话限制

```
Key:    conv:active:{visitorId}
类型:   Set
内容:   { "conv_uuid_001", "conv_uuid_002" }
TTL:    不设过期
限制:   单个访客最多同时3个活跃会话
说明:   SADD前检查SCARD，超限时自动关闭最旧的会话
```

---

## 六、热统计数据缓存

### 6.1 数据看板实时数据

```
Key:    stats:dashboard:{date}         (如 stats:dashboard:2026-05-16)
类型:   Hash
内容:
  {
    "totalConversations": 1250,
    "totalMessages": 8530,
    "transferCount": 154,
    "helpfulCount": 3800,
    "unhelpfulCount": 850,
    "totalTokens": 1250000
  }
TTL:    7天
更新:   每个事件发生时 HINCRBY 增量更新

WebSocket推送时机:
  - conversation:created → HINCRBY totalConversations 1 → 推送更新
  - message:sent → HINCRBY totalMessages 1 → 推送更新
  - transfer:requested → HINCRBY transferCount 1 → 推送更新
  - feedback:submitted → HINCRBY helpfulCount/unhelpfulCount 1 → 推送更新
```

### 6.2 热问排行

```
Key:    stats:hot:daily:{date}         (如 stats:hot:daily:2026-05-16)
类型:   Sorted Set
内容:   { 问题文本: 出现次数 }
TTL:    7天
更新:   每次问题Hash在RAG缓存中命中时 ZINCRBY +1

获取热问Top N:
  ZREVRANGE stats:hot:daily:2026-05-16 0 19 WITHSCORES
```

### 6.3 意图分布计数

```
Key:    stats:intent:{date}
类型:   Hash
内容:   { 意图类型: 计数 }
TTL:    7天
更新:   每条AI消息生成后 HINCRBY +1
```

---

## 七、分布式锁

### 7.1 使用场景

| 场景 | Lock Key | 说明 |
|------|----------|------|
| 文档处理 | `lock:document:{documentId}` | 防止并发处理同一文档 |
| 分区创建 | `lock:partition:monthly` | 防止并发创建分区 |
| 摘要生成 | `lock:summary:{conversationId}` | 防止并发生成同一会话摘要 |
| 定时任务 | `lock:cron:{taskName}` | 防止定时任务重复执行 |

### 7.2 锁实现

```typescript
// 使用Redlock算法的简化版（单节点用SET NX EX即可）
async function acquireLock(
  key: string, ttlMs: number = 30000
): Promise<string | null> {
  const lockValue = crypto.randomUUID();
  const result = await redis.set(
    `lock:${key}`,
    lockValue,
    'PX', ttlMs,   // 毫秒级过期
    'NX'            // 仅当Key不存在时设置
  );
  return result === 'OK' ? lockValue : null;
}

async function releaseLock(key: string, lockValue: string): Promise<boolean> {
  // Lua脚本保证原子性：只有持有锁的进程才能释放
  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  const result = await redis.eval(script, 1, `lock:${key}`, lockValue);
  return result === 1;
}
```

---

## 八、缓存预热策略

### 8.1 系统启动预热

```
启动时加载到L1（应用内存）:
  1. system_configs 全部配置项
  2. 敏感词库（从MinIO文件加载）
  3. 管理员角色权限映射

启动时预加载到L2（Redis）:
  1. 活跃的session token（从PostgreSQL恢复最近24h的会话）
  2. 昨天的热问Top 20（带TTL续期）
  3. 今天的看板统计数据（如存在则恢复）
```

### 8.2 知识库更新后预热

```
// 文档处理完成后
async function warmUpDocumentCache(documentId: string) {
  // 1. 取该文档的热门关联问题（从历史消息中提取）
  const hotQuestions = await getHotQuestionsByDocument(documentId);

  // 2. 异步预计算缓存（限制并发，防止打爆DeepSeek API）
  const batchSize = 5;
  for (let i = 0; i < hotQuestions.length; i += batchSize) {
    const batch = hotQuestions.slice(i, i + batchSize);
    await Promise.all(batch.map(q => precomputeAnswer(q, documentId)));
    await sleep(2000); // 批次间隔，控制API调用频率
  }
}
```

---

## 九、监控与告警

### 9.1 Redis监控指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| 内存使用率 | >80% | 需扩容或优化淘汰策略 |
| 连接数 | >500 | 连接泄漏风险 |
| 命中率 | <70% | 缓存策略需优化 |
| 命令延迟P99 | >10ms | Redis性能瓶颈 |
| 过期Key速率 | 突增 | 可能有异常的大量Key同时过期 |
| AOF重写状态 | 失败 | 数据持久化风险 |

### 9.2 业务监控指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| RAG缓存命中率 | <30% | 知识库或缓存策略需优化 |
| 限流触发次数 | 突增5倍 | 可能存在恶意攻击 |
| Token日消耗 | 超过预算120% | 成本失控预警 |

---

## 十、Redis配置参考

```conf
# redis.conf 关键配置

# 内存
maxmemory 2gb
maxmemory-policy volatile-lru

# 持久化（RDB + AOF 混合）
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
aof-use-rdb-preamble yes

# 连接
timeout 300
tcp-keepalive 60
maxclients 10000

# 慢查询日志
slowlog-log-slower-than 10000  # 10ms
slowlog-max-len 128

# 延迟监控
latency-monitor-threshold 100
```
