# 新鼎电炉科技——智能客服系统 后端架构设计

## 一、架构总览

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                       Entry Layer (入口层)                        │
│  main.ts → AppModule → 全局中间件链 → 路由分发                    │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    Controller Layer (控制器层)                    │
│  GatewayController  AuthController  ConversationController       │
│  KnowledgeController  AgentController  WorkOrderController       │
│  AnalyticsController  AdminController  SystemController          │
│  职责: 路由定义、参数校验、请求响应转换、Swagger装饰器              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     Service Layer (业务服务层)                    │
│  GatewayService  AuthService  ConversationService                │
│  KnowledgeService  AgentService  WorkOrderService                │
│  AnalyticsService  SystemService                                 │
│  职责: 业务逻辑编排、事务管理、跨模块调用                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                  Infrastructure Layer (基础设施层)                │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ PrismaService│ │RedisSvc  │ │MinioSvc  │ │ MilvusService │  │
│  │ (数据库ORM)  │ │(缓存)    │ │(文件存储)│ │ (向量检索)    │  │
│  └──────────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ DifyClient   │ │QueueSvc  │ │SSEManager│ │EmbeddingSvc   │  │
│  │ (Dify代理)   │ │(任务队列)│ │(SSE推送) │ │(向量化服务)   │  │
│  └──────────────┘ └──────────┘ └──────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Nest.js模块依赖图

```
                          ┌─────────────┐
                          │  AppModule  │
                          └──────┬──────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
   ┌─────▼─────┐          ┌─────▼─────┐          ┌─────▼─────┐
   │ ConfigModule│        │ PrismaModule│        │ CacheModule│
   │(全局配置)  │        │(数据库ORM) │        │(Redis)    │
   └───────────┘          └───────────┘          └───────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
    ┌────────────┬───────────────┼───────────────┬────────────┐
    │            │               │               │            │
┌───▼───┐  ┌────▼────┐  ┌──────▼──────┐  ┌─────▼────┐ ┌────▼────┐
│Auth   │  │Gateway  │  │Conversation │  │Knowledge │ │Agent    │
│Module │  │Module   │  │Module       │  │Module    │ │Module   │
└───┬───┘  └─────────┘  └──────┬──────┘  └─────┬────┘ └────┬────┘
    │                          │               │            │
    │                    ┌─────▼─────┐         │            │
    │                    │WorkOrder  │         │            │
    │                    │Module     │         │            │
    │                    └───────────┘         │            │
    │                                          │            │
    │              ┌───────────────────────────┘            │
    │              │                                        │
    │        ┌─────▼─────┐  ┌───────────┐  ┌──────────┐    │
    │        │Analytics  │  │ System    │  │Storage   │    │
    │        │Module     │  │ Module    │  │Module    │    │
    │        └───────────┘  └───────────┘  └──────────┘    │
    │                                                       │
    └───────────────── 全部依赖 ────────────────────────────┘
              PrismaModule, CacheModule, ConfigModule
```

---

## 二、模块详细设计

### 2.1 AuthModule（认证鉴权模块）

```
auth/
├── auth.module.ts
├── auth.controller.ts          # POST /auth/session, /admin/auth/login ...
├── auth.service.ts              # 登录逻辑、Token签发
├── session.service.ts           # 访客会话管理
├── strategies/
│   ├── jwt.strategy.ts          # JWT验证策略
│   └── session.strategy.ts      # Session Token验证策略
├── guards/
│   ├── jwt-auth.guard.ts        # 管理后台JWT守卫
│   ├── session-auth.guard.ts    # 访客Session守卫
│   └── roles.guard.ts           # 角色权限守卫（@Roles('super_admin')）
└── decorators/
    ├── roles.decorator.ts       # @Roles() 参数装饰器
    ├── current-user.decorator.ts # @CurrentUser() 获取当前用户
    └── public.decorator.ts      # @Public() 跳过鉴权
```

**核心逻辑**：
```typescript
@Injectable()
export class AuthService {
  async createSession(dto: CreateSessionDto): Promise<SessionResponse> {
    // 1. 根据指纹查找/创建 Visitor
    // 2. 创建 Conversation + sessionToken
    // 3. Redis 存储 session:token + csrf:token
    // 4. 返回 sessionToken, csrfToken, conversationId, 欢迎语
  }

  async adminLogin(dto: LoginDto): Promise<LoginResponse> {
    // 1. 查询 admin_users
    // 2. bcrypt 验证密码
    // 3. 签发 JWT accessToken + refreshToken
    // 4. 更新 lastLoginAt, loginCount
    // 5. Redis 存储 refreshToken 白名单
  }
}
```

---

### 2.2 GatewayModule（SSE网关模块）

```
gateway/
├── gateway.module.ts
├── gateway.controller.ts       # GET /conversations/:id/stream
├── gateway.service.ts          # SSE连接生命周期管理
└── sse-manager.service.ts      # SSE连接池管理
```

**SSE连接管理**：
```typescript
@Injectable()
export class SSEManagerService {
  // conversationId → SSE连接映射
  private connections = new Map<string, { controller: Subject, cleanup: () => void }>();

  createConnection(conversationId: string, res: Response): Observable<MessageEvent> {
    // 1. 检查并发连接数限制
    // 2. 如果已有连接，关闭旧连接
    // 3. 创建新的SSE连接
    // 4. 设置心跳定时器（每30秒发ping）
    // 5. 监听连接关闭事件 → 清理资源
  }

  pushEvent(conversationId: string, event: SSEEvent): void {
    // 将事件推送到对应会话的SSE连接
  }

  getActiveConnectionCount(): number { ... }
}
```

**SSE端点实现**：
```typescript
@Controller('conversations')
export class GatewayController {
  @Sse(':id/stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  streamMessages(
    @Param('id') id: string,
    @Query('messageId') messageId: string,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    return this.gatewayService.createStream(id, messageId, res);
  }
}
```

---

### 2.3 ConversationModule（对话管理模块）

```
conversation/
├── conversation.module.ts
├── conversation.controller.ts  # 访客端: POST/GET messages, GET conversations
├── conversation.service.ts     # 对话CRUD、状态管理
├── message.service.ts          # 消息CRUD
└── context-manager.service.ts  # 上下文管理（摘要生成、滑动窗口）
```

**上下文管理器**：
```typescript
@Injectable()
export class ContextManagerService {
  async getContext(conversationId: string): Promise<ConversationContext> {
    // 1. 从 Redis conv:context:{id} 读取
    // 2. 如果Redis未命中，从PostgreSQL重建上下文
    // 3. 返回 { summary, slidingWindow, extractedSlots, intentHistory }
  }

  async updateContext(conversationId: string, message: Message): Promise<void> {
    // 1. 追加消息到 slidingWindow
    // 2. 检查是否需要生成新摘要
    // 3. 更新槽位提取结果
    // 4. 写回 Redis + 续期TTL
  }

  async generateSummary(conversationId: string): Promise<string> {
    // 1. 取最早5轮对话 + 旧摘要
    // 2. 调用 DeepSeek 轻量生成摘要
    // 3. 返回一句话摘要
  }

  getTokenBudget(context: ConversationContext): TokenBudget { ... }
}
```

---

### 2.4 KnowledgeModule（知识库管理模块）

```
knowledge/
├── knowledge.module.ts
├── knowledge.controller.ts     # 管理后台: CRUD 文档、上传、预览测试
├── knowledge.service.ts        # 文档生命周期管理
├── document.service.ts         # 文档解析管道
├── chunk.service.ts            # 分块策略 + 向量化
└── processors/
    ├── pdf.processor.ts        # PDF解析
    ├── docx.processor.ts       # Word解析
    ├── xlsx.processor.ts       # Excel解析
    └── text.processor.ts       # TXT/MD解析
```

**文档处理管道**：
```typescript
@Injectable()
export class DocumentService {
  async processDocument(documentId: string): Promise<void> {
    // 1. 获取分布式锁 lock:document:{id}
    // 2. 从MinIO下载文件
    // 3. 根据文件类型选择解析器
    // 4. 文本清洗（去重、格式化、特殊字符处理）
    // 5. 语义分块（调用 chunk.service）
    // 6. 向量化（调用 EmbeddingService）
    // 7. 向量写入 Milvus
    // 8. 分块元数据写入 PostgreSQL
    // 9. 更新文档状态→active
    // 10. 触发缓存预热
    // 11. WebSocket 推送完成通知
    // 12. 释放分布式锁
  }
}

// 策略模式：不同类型不同解析器
interface DocumentProcessor {
  supportedTypes: string[];
  parse(filePath: string): Promise<ParseResult>;
}
```

---

### 2.5 AgentModule（Dify代理模块）

```
agent/
├── agent.module.ts
├── agent.controller.ts         # 内部API: POST /internal/dify/*
├── agent.service.ts            # Agent调用编排
├── dify-client.service.ts      # Dify HTTP Client封装
└── strategies/
    └── intent-routing.strategy.ts  # 意图路由策略
```

**Dify客户端封装**：
```typescript
@Injectable()
export class DifyClientService {
  private readonly httpService: HttpService;
  private readonly circuitBreaker: CircuitBreaker;

  async chatStream(
    query: string,
    conversationId: string,
    context: ConversationContext,
    userId: string,
  ): Promise<Observable<DifyStreamEvent>> {
    // 1. 组装Dify请求参数
    // 2. 通过熔断器调用 Dify API
    // 3. 返回 Observable<流式事件>
    // 4. 设置超时（30s）
    // 5. 错误重试（最多2次，间隔1s）
  }

  async chatBlocking(
    query: string,
    conversationId: string,
    context: ConversationContext,
    userId: string,
  ): Promise<DifyBlockingResponse> {
    // 同步模式调用（知识库预览测试等场景使用）
  }
}
```

**Agent服务编排**：
```typescript
@Injectable()
export class AgentService {
  async handleUserMessage(
    conversationId: string,
    userMessage: string,
  ): Promise<void> {
    // 1. 获取对话上下文
    const context = await this.contextManager.getContext(conversationId);

    // 2. 缓存检查
    const questionHash = hashQuestion(userMessage);
    const cached = await this.cacheService.getRagAnswer(questionHash);
    if (cached) {
      // 缓存命中，直接推送
      await this.sseManager.pushEvent(conversationId, { event: 'done', data: cached });
      return;
    }

    // 3. 调用Dify流式接口
    const stream$ = await this.difyClient.chatStream(
      userMessage, conversationId, context, visitorId
    );

    // 4. 订阅流式事件 → 转发SSE → 持久化
    stream$.subscribe({
      next: (event) => {
        this.sseManager.pushEvent(conversationId, event);
        if (event.event === 'done') {
          this.handleCompletedAnswer(conversationId, userMessage, event.data);
        }
      },
      error: (err) => {
        this.sseManager.pushEvent(conversationId, { event: 'error', data: err });
      }
    });
  }

  private async handleCompletedAnswer(convId: string, question: string, answer: DifyDoneData) {
    // 1. 持久化AI消息到PostgreSQL
    // 2. 写入RAG缓存（问题→答案 + 文档→缓存映射）
    // 3. 更新对话上下文（追加消息、触发摘要）
    // 4. 更新统计计数（意图分布、热问排行）
    // 5. 检查置信度 → 决定是否提示转人工
  }
}
```

---

### 2.6 WorkOrderModule（工单模块）

```
workorder/
├── workorder.module.ts
├── workorder.controller.ts     # 管理后台: CRUD 工单
├── workorder.service.ts        # 工单生命周期
└── notification.service.ts     # 工单通知（第一期: 管理后台站内通知）
```

---

### 2.7 AnalyticsModule（数据分析模块）

```
analytics/
├── analytics.module.ts
├── analytics.controller.ts     # 管理后台: GET /dashboard/*, GET /stats/*
├── analytics.service.ts        # 统计查询、数据聚合
└── report.service.ts           # 报表生成
```

---

### 2.8 SystemModule（系统管理模块）

```
system/
├── system.module.ts
├── system.controller.ts        # super_admin: 配置管理、用户管理
├── system.service.ts           # 配置CRUD
└── user-admin.service.ts       # 管理员账户管理
```

---

## 三、中间件链设计

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局中间件链（按顺序执行）
  app.use([
    requestIdMiddleware,      // 1. 注入 X-Request-ID
    requestLogMiddleware,      // 2. 请求日志（method, url, ip, user-agent）
    helmetMiddleware,          // 3. 安全Header
    corsMiddleware,            // 4. CORS 跨域
    rateLimitMiddleware,       // 5. 限流检查
    sessionParseMiddleware,    // 6. 解析 X-Session-Token / Authorization
    sensitiveWordMiddleware,   // 7. 敏感词过滤（请求体）
    bodyParserMiddleware,      // 8. Body解析
  ]);

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger
  setupSwagger(app);

  // 优雅关机
  app.enableShutdownHooks();

  await app.listen(3100);
}
```

**各中间件职责**：

| 顺序 | 中间件 | 职责 |
|------|--------|------|
| 1 | requestIdMiddleware | 从X-Request-ID Header取或生成UUID，注入到req.requestId |
| 2 | requestLogMiddleware | 记录 method, url, status, duration, clientIp |
| 3 | helmetMiddleware | 设置安全相关HTTP头 |
| 4 | corsMiddleware | 官网域名白名单，管理后台域名白名单 |
| 5 | rateLimitMiddleware | 基于 Redis 的滑动窗口限流 |
| 6 | sessionParseMiddleware | 解析鉴权Token，注入 req.user 或 req.visitor |
| 7 | sensitiveWordMiddleware | 请求体敏感词过滤 |
| 8 | bodyParserMiddleware | JSON body解析（含大小限制 1MB） |

---

## 四、Dify代理层详细设计

### 4.1 代理架构

```
Nest.js AgentService
        │
        ▼
┌───────────────────┐
│  DifyClientService │  ← HTTP Client 封装
│  ┌───────────────┐ │
│  │CircuitBreaker │ │  ← 熔断器
│  │ (状态机)      │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │RetryStrategy  │ │  ← 重试策略
│  │ (指数退避)    │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │TimeoutControl │ │  ← 超时控制
│  │ (30s)         │ │
│  └───────────────┘ │
└────────┬──────────┘
         │ HTTP
         ▼
┌───────────────────┐
│  Dify 社区版容器   │
│  http://dify:5001 │
│  /v1/chat-messages│
│  /v1/workflows/run│
└───────────────────┘
```

### 4.2 Dify API 映射

| Dify API | Nest.js 代理端点 | 用途 |
|----------|-----------------|------|
| POST /v1/chat-messages | internal | 发送对话消息（流式） |
| POST /v1/workflows/run | internal | 触发工作流 |
| GET /v1/conversations | internal | 获取Dify会话列表 |
| GET /v1/conversations/{id}/variables | internal | 获取会话变量（槽位等） |
| GET /v1/datasets | internal | 获取知识库列表 |

### 4.3 熔断器配置

```typescript
const difyCircuitBreakerConfig = {
  failureThreshold: 5,        // 连续5次失败打开熔断器
  successThreshold: 2,        // 2次成功关闭熔断器
  timeout: 30000,             // 30秒后尝试半开
  fallbackResponse: {
    message: 'AI客服暂时不可用，请稍后重试或联系人工客服',
    suggestion: 'transfer'
  }
};
```

---

## 五、配置管理

### 5.1 配置加载策略

```
优先级（从高到低）:
1. 环境变量 (.env)
2. system_configs 表（数据库，支持运行时修改）
3. Redis 缓存 config:* (热配置，实时生效)
4. 代码默认值
```

```typescript
@Injectable()
export class AppConfigService {
  async get<T>(key: string): Promise<T> {
    // 1. 尝试从 Redis config:{key} 读取
    let value = await this.redis.get(`config:${key}`);
    if (value) return JSON.parse(value);

    // 2. 从 PostgreSQL system_configs 表读取
    const config = await this.prisma.systemConfig.findUnique({ where: { configKey: key } });
    if (config) {
      // 回写Redis缓存
      await this.redis.set(`config:${key}`, JSON.stringify(config.configValue), 'EX', 3600);
      return config.configValue as T;
    }

    // 3. 返回代码默认值
    return this.defaultConfigs[key] as T;
  }

  async set(key: string, value: any): Promise<void> {
    // 1. 更新 PostgreSQL
    // 2. 更新 Redis
    // 3. 更新 L1 内存缓存
    // 4. WebSocket 通知配置变更
  }
}
```

---

## 六、日志系统

### 6.1 日志架构

```
Winston Logger
  ├── Console Transport (开发环境 + 生产环境)
  ├── File Transport (按日期轮转)
  │   ├── logs/app-2026-05-16.log     (全部日志)
  │   ├── logs/error-2026-05-16.log   (仅error级别)
  │   └── logs/access-2026-05-16.log  (请求日志)
  └── (可选) Elasticsearch Transport → Kibana

日志级别:
  error: 系统异常、服务不可用
  warn:  限流触发、缓存未命中率高、Token超预算
  info:  请求日志、业务操作日志（登录、上传、转人工）
  debug: Dify调用详情、缓存命中/未命中、Token消耗明细
  verbose: 完整请求/响应体（开发环境）
```

### 6.2 日志格式

```json
{
  "timestamp": "2026-05-16T08:30:00.000Z",
  "level": "info",
  "requestId": "req_uuid_xxxx",
  "context": "AgentService",
  "message": "AI answer completed",
  "metadata": {
    "conversationId": "uuid_conv_001",
    "messageId": "uuid_msg_002",
    "intent": "product_inquiry",
    "confidence": 0.92,
    "tokensUsed": 380,
    "cacheHit": false,
    "durationMs": 3200
  }
}
```

---

## 七、异常处理体系

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // 1. 异常分类映射
    const { status, errorCode, message } = this.mapException(exception);

    // 2. 记录日志
    this.logger.error({
      requestId: request.requestId,
      exception: exception instanceof Error ? exception.message : 'Unknown',
      stack: exception instanceof Error ? exception.stack : undefined,
      path: request.url,
    });

    // 3. 返回统一错误响应
    response.status(status).json({
      code: errorCode,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.requestId,
      }
    });
  }

  private mapException(exception: unknown): { status: number; errorCode: number; message: string } {
    if (exception instanceof BadRequestException) return { status: 400, errorCode: 40001, message: exception.message };
    if (exception instanceof UnauthorizedException) return { status: 401, errorCode: 40101, message: '未认证或Token失效' };
    if (exception instanceof ForbiddenException) return { status: 403, errorCode: 40301, message: '权限不足' };
    if (exception instanceof NotFoundException) return { status: 404, errorCode: 40401, message: exception.message };
    if (exception instanceof RateLimitException) return { status: 429, errorCode: 42901, message: '请求过于频繁' };
    if (exception instanceof DifyServiceException) return { status: 502, errorCode: 50201, message: 'AI服务异常' };
    // 默认500
    return { status: 500, errorCode: 50001, message: '服务器内部错误' };
  }
}
```

---

## 八、任务队列设计

### 8.1 Bull队列

```typescript
// 使用 Bull + Redis 实现异步任务队列
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'document-process' },   // 文档处理队列
      { name: 'cache-warmup' },       // 缓存预热队列
      { name: 'analytics-report' },   // 分析报表队列
      { name: 'notification' },       // 通知队列
    )
  ]
})
export class QueueModule {}

// 文档处理消费者
@Processor('document-process')
export class DocumentProcessor {
  @Process('parse-and-index')
  async handleDocument(job: Job<{ documentId: string }>) {
    await this.documentService.processDocument(job.data.documentId);
    // 进度通过 job.progress(percent) 报告
  }
}
```

### 8.2 队列配置

| 队列名称 | 并发数 | 超时 | 重试 | 说明 |
|----------|--------|------|------|------|
| document-process | 2 | 5min | 3次 | 文档解析+向量化是CPU/GPU密集型 |
| cache-warmup | 5 | 2min | 2次 | 缓存预热可并行 |
| analytics-report | 1 | 10min | 1次 | 报表生成串行避免并发冲突 |
| notification | 10 | 30s | 3次 | 通知发送高并发 |

---

## 九、健康检查

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly httpService: HttpService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const results = await Promise.allSettled([
      this.checkDatabase(),     // PostgreSQL: SELECT 1
      this.checkRedis(),        // Redis: PING
      this.checkDify(),         // Dify: GET /health
      this.checkDeepSeek(),     // DeepSeek: HEAD /v1/models
      this.checkMinio(),        // MinIO: HEAD /minio/health/live
      this.checkMilvus(),       // Milvus: 检查连接
    ]);

    return {
      status: results.every(r => r.status === 'fulfilled') ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database:    { status: results[0].status },
        redis:       { status: results[1].status },
        dify:        { status: results[2].status },
        deepseek:    { status: results[3].status },
        minio:       { status: results[4].status },
        milvus:      { status: results[5].status },
      }
    };
  }
}
```

---

## 十、优雅关机

```typescript
// main.ts
app.enableShutdownHooks();

// 监听 SIGTERM / SIGINT
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, starting graceful shutdown...');

  // 1. 停止接收新请求
  await app.close();

  // 2. 等待进行中的请求完成（最多30秒）
  await sleep(30000);

  // 3. 关闭SSE连接
  sseManager.closeAll();

  // 4. 关闭Bull队列
  await queueManager.closeAll();

  // 5. 关闭数据库连接
  await prisma.$disconnect();

  // 6. 关闭Redis连接
  await redis.quit();

  process.exit(0);
});
```

---

## 十一、Dockerfile

```dockerfile
# packages/server/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3100/api/health || exit 1

CMD ["node", "dist/main.js"]
```

## 十二、Docker Compose（生产环境关键片段）

```yaml
# docker-compose.prod.yml 核心服务定义
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on: [nest-backend, nuxt-app, admin-frontend]

  postgres:
    image: postgres:15-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: xd_smart_cs
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    deploy:
      resources:
        limits: { memory: 4G }

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy volatile-lru
    volumes: [rdata:/data]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes: [minio_data:/data]
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}

  dify:
    image: langgenius/dify-api:0.11.0-community
    # Dify 官方 docker-compose 配置此处展开...
    depends_on: [postgres, redis]

  nest-backend:
    build: ./packages/server
    environment: [... 所有环境变量]
    depends_on: [postgres, redis, minio, dify]

volumes:
  pgdata: {}
  rdata: {}
  minio_data: {}
```
