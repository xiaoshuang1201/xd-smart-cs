# 新鼎电炉科技——智能客服系统 业务流程设计

## 一、核心业务流程图索引

| 编号 | 流程 | 涉及模块 | 关键指标 |
|------|------|----------|----------|
| BP-01 | 访客咨询全流程 | Auth + Agent + RAG | 首包延时 < 3s |
| BP-02 | 转人工流程 | Agent + WorkOrder | 置信度阈值 0.6 |
| BP-03 | 知识库文档入库流程 | Knowledge + Milvus | 处理时间 < 2min |
| BP-04 | 多轮对话上下文管理 | Agent + Context Manager | Token预算控制 |
| BP-05 | 管理员配置Agent流程 | Admin + Agent | — |
| BP-06 | 未命中知识监测与补充 | Analytics + Knowledge | 每周Top 10审查 |
| BP-07 | 限流与降级流程 | Rate Limiter + Gateway | 系统可用性 99.5% |

---

## 二、BP-01：访客咨询全流程

```mermaid
sequenceDiagram
    actor Visitor as 访客
    participant Nuxt as Nuxt 3 官网
    participant Nest as Nest.js 后端
    participant Redis as Redis
    participant Dify as Dify Agent
    participant Milvus as Milvus 向量库
    participant DeepSeek as DeepSeek-V3

    Note over Visitor,DeepSeek: === 阶段1：会话初始化 ===
    Visitor->>Nuxt: 打开官网页面
    Nuxt->>Nuxt: 生成浏览器指纹 (SHA256)
    Nuxt->>Nest: POST /api/v1/auth/session
    Nest->>Redis: 查询 visitor:fingerprint:{fp}
    alt 新访客
        Nest->>Nest: INSERT INTO visitors
        Nest->>Redis: SET visitor:fingerprint:{fp}
    else 老访客
        Nest->>Nest: UPDATE last_seen_at
    end
    Nest->>Nest: INSERT INTO conversations
    Nest->>Redis: HSET session:token:{token}
    Nest-->>Nuxt: 返回 sessionToken + conversationId + 欢迎语

    Note over Visitor,DeepSeek: === 阶段2：发送消息 ===
    Visitor->>Nuxt: 输入问题："800公斤钢料用多大功率？"
    Nuxt->>Nest: POST /api/v1/conversations/{id}/messages
    Nest->>Redis: 限流检查 rate:message:{session}
    Nest->>Nest: INSERT INTO messages (role=user)

    Note over Visitor,DeepSeek: === 阶段3：RAG缓存检查 ===
    Nest->>Redis: GET rag:answer:{questionHash}
    alt 缓存命中
        Redis-->>Nest: 返回缓存答案
        Nest->>Nest: INSERT INTO messages (role=assistant)
        Nest-->>Nuxt: SSE: 推送缓存答案 (极速响应 < 50ms)
        Nuxt-->>Visitor: 显示完整答案（无打字动画）
    else 缓存未命中
        Note over Visitor,DeepSeek: === 阶段4：Agent处理 ===
        Nest->>Redis: GET conv:context:{conversationId}
        Redis-->>Nest: 对话上下文(摘要+滑动窗口)
        Nest->>Dify: POST /chat-messages (query + context + pageContext)
        Dify->>Dify: 意图识别
        Dify-->>Nest: SSE: event=thinking (正在理解...)
        Nest-->>Nuxt: SSE 转发: event=thinking

        Dify->>Milvus: 向量检索 (语义相似度)
        Dify->>Milvus: 关键词检索 (BM25)
        Milvus-->>Dify: Top N 相关片段
        Dify->>Dify: 重排序 (BGE-Reranker)
        Dify-->>Nest: SSE: event=searching (找到N个相关片段)
        Nest-->>Nuxt: SSE 转发

        Dify->>DeepSeek: LLM生成 (retrieved_chunks + query + context)
        DeepSeek-->>Dify: 流式 Token 返回
        Dify-->>Nest: SSE: event=token (逐字推送)
        Nest-->>Nuxt: SSE 转发: event=token
        Nuxt-->>Visitor: 逐字渲染（打字机效果）

        Dify-->>Nest: SSE: event=done (完整结果)
        Nest-->>Nuxt: SSE 转发: event=done

        Note over Visitor,DeepSeek: === 阶段5：结果持久化与缓存 ===
        Nest->>Nest: INSERT INTO messages (role=assistant)
        Nest->>Redis: HSET rag:answer:{questionHash}
        Nest->>Redis: SADD rag:doc_cache:{docId} questionHash
        Nest->>Redis: ZINCRBY stats:hot:daily:{date}
        Nest->>Redis: HSET conv:context:{conversationId}
    end

    Note over Visitor,DeepSeek: === 阶段6：收集反馈 ===
    Nuxt-->>Visitor: 显示 [👍 有用] [👎 无用] 按钮
    Visitor->>Nuxt: 点击 👍
    Nuxt->>Nest: POST /api/v1/messages/{id}/feedback
    Nest->>Nest: UPDATE messages SET feedback='helpful'
    Nest->>Redis: HINCRBY stats:dashboard:{date} helpfulCount 1
    Nest-->>Nuxt: 200 OK
    Nuxt-->>Visitor: "感谢您的反馈！"
```

**关键决策点**：
1. **会话初始化**：老访客复用已有visitor记录，不重复创建
2. **RAG缓存命中**：与LLM生成结果等价，但响应时间从秒级→毫秒级
3. **意图路由**：Dify内部根据意图分发到不同处理节点（产品咨询→检索知识库 / 闲聊→预设回复）

---

## 三、BP-02：转人工流程

```mermaid
sequenceDiagram
    actor Visitor as 访客
    participant Nuxt as Nuxt 3
    participant Nest as Nest.js
    participant Dify as Dify Agent
    participant DB as PostgreSQL
    participant Admin as 管理后台(客服)

    Note over Visitor,Admin: === 触发条件 ===
    Visitor->>Nuxt: 输入复杂问题
    Nuxt->>Nest: POST /messages
    Nest->>Dify: 转发问题
    Dify->>Dify: 意图识别 + RAG检索
    Dify->>Dify: 计算置信度: 0.35 < 阈值 0.6

    Note over Visitor,Admin: === Agent主动提示转人工 ===
    Dify-->>Nest: SSE: event=need_transfer
    Nest->>DB: UPDATE conversations SET agent_confidence=0.35
    Nest-->>Nuxt: SSE: event=need_transfer {message: "是否转人工？"}
    Nuxt-->>Visitor: 显示转人工确认卡片

    Note over Visitor,Admin: === 用户确认转人工 ===
    Visitor->>Nuxt: 点击"确认转接" + 输入联系方式
    Nuxt->>Nest: POST /api/v1/conversations/{id}/transfer

    Nest->>Nest: 生成AI对话摘要
    Nest->>DB: INSERT INTO work_orders
    Nest->>DB: UPDATE conversations SET status='transferred'

    Nest-->>Nuxt: 返回成功 + 预计响应时间
    Nuxt-->>Visitor: "已为您创建工单，技术专家将在2小时内联系您"

    Note over Visitor,Admin: === 客服处理 ===
    Admin->>Admin: 登录管理后台，看到新工单通知
    Admin->>Nest: GET /api/v1/admin/workorders/{id}
    Nest->>DB: 查询工单 + 关联对话历史
    Nest-->>Admin: 工单详情 + AI对话摘要 + 完整对话
    Admin->>Admin: 阅读对话背景，了解问题
    Admin->>Nest: PATCH /api/v1/admin/workorders/{id} (status=processing)
    Admin->>Visitor: 通过电话/微信联系客户 (线下)
    Admin->>Admin: 解决客户问题
    Admin->>Nest: PATCH /api/v1/admin/workorders/{id} (status=resolved + 备注)
    Nest->>DB: UPDATE work_orders, UPDATE conversations SET resolved_by, resolved_at
```

**置信度计算逻辑**（在Dify工作流中配置）：
```
confidence = 
  retrieval_score × 0.5        // RAG检索相关性
  + intent_clarity × 0.3       // 意图识别清晰度
  + answer_consistency × 0.2   // 生成答案自洽性

if confidence < threshold (0.6):
  → 触发 need_transfer 事件
```

---

## 四、BP-03：知识库文档入库流程

```mermaid
flowchart TD
    A[管理员上传文档] --> B{文件类型校验}
    B -->|不支持| B1[返回错误提示]
    B -->|支持| C[上传至MinIO]
    C --> D[写入 knowledge_docs status=processing]
    D --> E[触发异步处理任务]

    subgraph AsyncProcessing [异步处理管道 - Bull Queue]
        E1[下载MinIO文件]
        E1 --> E2{文件类型}
        E2 -->|PDF| E3A[pdf-parse 解析]
        E2 -->|DOCX| E3B[mammoth 解析]
        E2 -->|XLSX| E3C[xlsx 解析]
        E2 -->|TXT/MD| E3D[直接读取]
        E3A & E3B & E3C & E3D --> E4[文本清洗]
        E4 --> E5[语义分块]
        subgraph Chunking [分块策略]
            E5 --> E5A[按段落/章节自然分割]
            E5A --> E5B[overlap = 10% 重叠窗口]
            E5B --> E5C[单块最大512 tokens]
            E5C --> E5D[最小块100 tokens 舍弃]
        end
        E5D --> E6[调用 BGE Embedding 生成向量]
        E6 --> E7[向量写入 Milvus]
        E7 --> E8[分块元数据写入 knowledge_chunks]
        E8 --> E9[更新 knowledge_docs status=active]
        E9 --> E10[触发缓存预热 rag:warmup]
    end

    D --> E
    E -->|处理中| F[WebSocket 推送进度]
    E9 -->|成功| G[WebSocket 推送完成]
    E -->|失败| H[更新 status=error + 记录错误信息]
```

**分块策略详解**：
```
文档结构:
┌─────────────────────────────────────────┐
│ 第1章 产品概述                            │
│   IGBT中频炉是一种...（200字）             │
│                                          │
│ 第2章 技术参数                            │
│   | 型号 | 功率 | 频率 | ...              │
│                                          │
│ 第3章 选型指南                            │
│   根据选型公式...（500字）                 │
└─────────────────────────────────────────┘

分块结果 (chunk_size=512, overlap=50):
  Chunk 0: "第1章 产品概述\nIGBT中频炉是一种..." (200 tokens)
  Chunk 1: "第2章 技术参数\n| 型号 | 功率 |..." (300 tokens)
  Chunk 2: "第2章 技术参数\n| 型号 | 功率 |...\n第3章 选型指南\n根据..." (512 tokens, 含overlap)
  Chunk 3: "第3章 选型指南\n根据选型公式..." (450 tokens)
```

**处理状态机**:
```mermaid
stateDiagram-v2
    [*] --> uploaded: 文件上传至MinIO
    uploaded --> parsing: 开始异步处理
    parsing --> chunking: 解析完成
    chunking --> embedding: 分块完成
    embedding --> storing: 向量化完成
    storing --> active: 入库完成
    active --> archived: 管理员归档
    active --> inactive: 管理员禁用
    parsing --> error: 解析失败
    chunking --> error: 分块失败
    embedding --> error: 向量化失败
    storing --> error: 入库失败
    error --> parsing: 管理员重试
    active --> archived: 软删除
```

---

## 五、BP-04：多轮对话上下文管理流程

```mermaid
sequenceDiagram
    participant Visitor as 访客
    participant Nest as Nest.js
    participant Redis as Redis
    participant DeepSeek as DeepSeek(摘要用)
    participant Dify as Dify

    Note over Visitor,Dify: === 每轮消息发送时 ===
    Visitor->>Nest: 发送第11轮消息
    Nest->>Redis: GET conv:context:{conversationId}

    Redis-->>Nest: 当前上下文: summary + slidingWindow(10轮)

    Nest->>Nest: 将新消息追加到 slidingWindow
    Nest->>Nest: 检查 slidingWindow.length >= 12 ?

    alt 触发摘要更新 (slidingWindow >= 12)
        Note over Nest,DeepSeek: 取最早5轮对话 + 旧摘要 → 生成新摘要
        Nest->>DeepSeek: prompt: "将以下对话总结为一句话摘要..."
        DeepSeek-->>Nest: 新摘要: "用户在咨询800kg钢料的中频炉选型和报价..."
        Nest->>Redis: 更新 conv:context summary
        Nest->>Redis: slidingWindow 保留最新10轮
    else 未触发摘要 (< 12)
        Nest->>Redis: slidingWindow 直接追加
    end

    Note over Nest,Dify: 向Dify发送请求时组装上下文
    Nest->>Nest: 组装上下文 = 摘要 + slidingWindow(10轮) + slots
    Nest->>Nest: 检查 Token 预算
    alt Token 超限 (> 4096)
        Nest->>Nest: 缩减 slidingWindow 至 6轮 + 摘要
    end
    Nest->>Dify: POST /chat-messages (query + 上下文)
```

**Token预算计算逻辑**:
```typescript
interface TokenBudget {
  maxTokens: number;          // 4096
  summaryTokens: number;      // ~200
  slotsTokens: number;        // ~50
  eachRoundTokens: number;    // ~200 (用户+AI各约100)
  reservedForAnswer: number;  // 1500 (留给LLM生成答案的预算)
}

function calculateWindowSize(budget: TokenBudget): number {
  const availableForHistory = budget.maxTokens
    - budget.summaryTokens
    - budget.slotsTokens
    - budget.reservedForAnswer;

  // 可用历史预算 / 每轮Token ≈ 能保留的轮数
  const maxRounds = Math.floor(availableForHistory / budget.eachRoundTokens);

  return Math.min(maxRounds, config.slidingWindowSize); // 最多10轮
}
```

---

## 六、BP-05：管理员配置Agent流程

```mermaid
flowchart TD
    A[管理员登录后台] --> B[进入 Agent配置 页面]
    B --> C[修改配置项]
    C --> D{配置类型}

    D -->|欢迎语/话术| E1[更新 system_configs 表]
    D -->|置信度阈值| E2[更新 system_configs + Redis缓存]
    D -->|Token/窗口| E3[更新 system_configs + 重启生效?]

    E1 & E2 --> F[PATCH /api/v1/admin/agent/configs]
    F --> G{校验}
    G -->|通过| H[更新 PostgreSQL system_configs]
    H --> I[更新 Redis 缓存: config:agent]
    G -->|失败| J[返回错误信息 + 回滚]

    I --> K[记录操作日志]
    K --> L[WebSocket 通知其他管理员配置变更]
    L --> M[前端更新显示]
```

---

## 七、BP-06：未命中知识监测与补充流程

```mermaid
flowchart TD
    subgraph DailyAutomation [每日自动分析 - Cron: 每天凌晨2点]
        A1[查询昨日数据] --> A2[筛选 confidence < 0.6 的消息]
        A2 --> A3[按问题相似度聚类 - BGE Embedding]
        A3 --> A4[生成"未命中问题Top 10"清单]
        A4 --> A5[存入 stats:unanswered:date]
    end

    subgraph AdminReview [管理员审查 - 每周一]
        B1[管理员查看数据看板] --> B2[查看未命中清单]
        B2 --> B3{判断原因}
        B3 -->|知识库缺失| B4[准备补充文档/FAQ]
        B3 -->|意图路由错误| B5[调整Agent配置/提示词]
        B3 -->|问题本身无意义| B6[忽略/标记已处理]
        B4 --> B7[上传新文档 → BP-03流程]
        B5 --> B8[更新Agent配置 → BP-05流程]
    end

    subgraph Verification [验证闭环]
        C1[补充知识后重新测试] --> C2{检索命中率提升?}
        C2 -->|是| C3[关闭该问题]
        C2 -->|否| C4[继续优化/标记为疑难]
    end

    DailyAutomation --> AdminReview
    AdminReview --> Verification
```

**聚类算法**（简化版）：
```typescript
async function clusterUnansweredQuestions(questions: Message[]): Promise<Cluster[]> {
  // 1. 批量向量化
  const embeddings = await batchEmbed(questions.map(q => q.content));

  // 2. 余弦相似度矩阵
  const clusters: Cluster[] = [];
  const visited = new Set<number>();

  for (let i = 0; i < questions.length; i++) {
    if (visited.has(i)) continue;
    const cluster: Cluster = { representative: questions[i], members: [questions[i]] };
    visited.add(i);

    for (let j = i + 1; j < questions.length; j++) {
      if (visited.has(j)) continue;
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      if (similarity > 0.85) {
        cluster.members.push(questions[j]);
        visited.add(j);
      }
    }
    clusters.push(cluster);
  }

  // 3. 按成员数量排序（越热门越靠前）
  return clusters.sort((a, b) => b.members.length - a.members.length).slice(0, 10);
}
```

---

## 八、BP-07：限流与降级流程

```mermaid
flowchart TD
    Start[请求到达 Nest.js] --> RateLimit{限流中间件检查}

    RateLimit -->|Redis 可用| RedisCheck[Redis 滑动窗口检查]
    RateLimit -->|Redis 不可用| DBFallback[PostgreSQL rate_limits 表降级]

    RedisCheck -->|未超限| Pass1[放行 + 计数器+1]
    RedisCheck -->|超限| Reject1[429 Too Many Requests]

    DBFallback -->|未超限| Pass2[放行]
    DBFallback -->|超限| Reject2[429 + 限流告警]

    Pass1 & Pass2 --> DifyCheck{Dify 可用?}
    DifyCheck -->|可用| NormalProcess[正常处理 → Agent回答]
    DifyCheck -->|不可用| Fallback1[返回预设兜底回复]

    Pass1 & Pass2 --> DeepSeekCheck{DeepSeek API 可用?}
    DeepSeekCheck -->|可用| NormalProcess
    DeepSeekCheck -->|不可用| Fallback2[Dify内部降级: 仅返回检索结果不生成]

    Pass1 & Pass2 --> MilvusCheck{Milvus 可用?}
    MilvusCheck -->|可用| NormalProcess
    MilvusCheck -->|不可用| Fallback3[仅用关键词匹配 + 返回有限答案]

    NormalProcess --> Return

    subgraph DegradationLevels [降级等级]
        L1[L1: 仅限流转为DB限流 - 基本功能正常]
        L2[L2: Dify不可用 - 返回预设回复: "客服系统维护中"]
        L3[L3: DeepSeek不可用 - 仅返回RAG检索片段不做生成]
        L4[L4: Milvus不可用 - 关键词匹配 + 提示转人工]
    end
```

**降级触发条件与恢复**：

```typescript
// 熔断器模式 (Circuit Breaker)
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly THRESHOLD = 5;      // 连续失败5次打开
  private readonly TIMEOUT = 30000;    // 30秒后半开尝试

  async call<T>(fn: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.TIMEOUT) {
        this.state = 'HALF_OPEN';
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return fallback();
    }
  }
}
```

---

## 九、完整的会话生命周期

```mermaid
stateDiagram-v2
    [*] --> created: 访客打开聊天窗口
    created --> active: 发送第一条消息
    active --> active: 多轮对话进行中
    active --> idle: 超过30分钟无新消息
    idle --> active: 访客发送新消息
    idle --> closed_timeout: 超过24小时未活动
    active --> transferred: Agent置信度<阈值+用户确认
    transferred --> resolved: 客服解决工单
    active --> closed_user: 用户主动关闭会话
    resolved --> [*]
    closed_timeout --> [*]
    closed_user --> [*]
```

---

## 十、定时任务清单

| Cron表达式       | 任务          | 说明                            |
| ------------- | ----------- | ----------------------------- |
| `0 2 * * *`   | 每日未命中分析     | 分析昨日低置信度问题，聚类生成清单             |
| `0 3 * * 0`   | 每周热问汇总      | 生成本周Top 20热问，发送邮件报告           |
| `0 4 1 * *`   | 每月分区创建      | 调用 create_monthly_partition() |
| `*/5 * * * *` | Redis缓存预热检查 | 检查活跃会话，确保上下文缓存不丢失             |
| `0 5 * * *`   | Token日消耗统计  | 统计昨日DeepSeek API调用量和费用        |
| `0 6 * * *`   | 数据看板昨日快照    | 将昨日最终数据快照存入PostgreSQL         |
