# XD-Agent-RAG-2026 智能客服系统 — 工程实施总规划

## 项目计划书
本规划基于用户昨日编写的7份设计文档（项目概述、数据库设计、API接口设计、前端页面设计、Redis缓存设计、业务流程、后端架构设计），为新鼎电炉科技智能客服系统制定从零到一的完整企业级实施路线图。

- **项目代号**: XD-Agent-RAG-2026

- **架构模式**: Monorepo (pnpm workspace + Turborepo)

- **技术栈**: Nuxt 3 + Nest.js + PostgreSQL + Redis + Milvus + MinIO + Dify + DeepSeek-V3

- **团队配置**: 2人（1前端全栈 + 1后端全栈）

- **预计总工期**: 84-98 人天（约10-12周）

- **目标上线**: 2026年Q3

  

---

  

## 一、版本控制与分支策略

  

### 1.1 Git分支模型

  

```

main          # 生产分支，只接受 release/* 和 hotfix/* 合并

develop       # 开发主分支，所有 feature/* 合并至此

feature/*     # 功能分支，从 develop 切出

release/*     # 发布分支，从 develop 切出，合并到 main + develop

hotfix/*      # 热修复分支，从 main 切出，合并到 main + develop

```

  

### 1.2 分支命名（每个Phase一条分支）

  

| Phase | 分支名 |

|-------|--------|

| Phase 0 | `feature/phase0-infra-setup` |

| Phase 1 | `feature/phase1-data-layer` |

| Phase 2 | `feature/phase2-infra-services` |

| Phase 3 | `feature/phase3-shared-common` |

| Phase 4 | `feature/phase4-core-auth-gateway-conv-agent` |

| Phase 5 | `feature/phase5-knowledge-workorder-analytics-system` |

| Phase 6 | `feature/phase6-web-chat-frontend` |

| Phase 7 | `feature/phase7-admin-frontend` |

| Phase 8 | `feature/phase8-integration-test-optimize` |

| Phase 9 | `release/v1.0.0` |

  

### 1.3 Commit规范（Conventional Commits）

  

```

feat: 新功能        fix: 修复Bug       docs: 文档

style: 格式         refactor: 重构      perf: 性能优化

test: 测试          chore: 构建/工具    ci: CI/CD

revert: 回滚

```

  

示例: `feat(auth): add JWT token refresh mechanism`

  

### 1.4 版本号（SemVer）

  

```

开发阶段: 0.1.0 → 0.2.0 → ... → 0.9.0

RC阶段:   1.0.0-rc.1 → 1.0.0-rc.2

GA发布:   1.0.0

每个Phase完成后打tag: v0.{phase}.0

```

  

---

  

## 二、Phase 0 — 环境搭建与基础设施（6人天）

  

### 目标

建立完整的开发环境、Docker基础设施、CI/CD流水线，确保团队可并行开发。

  

### 文件清单（共约35个文件）

  

**根目录配置（14个文件）**:

```

xd-smart-cs/

├── .gitignore                  [√] 

├── .gitattributes                      [√] 

├── .editorconfig                              [√] 

├── .prettierrc / .prettierignore           [√] 

├── .eslintrc.cjs / .eslintignore              [√] 

├── .nvmrc                          # Node 20 LTS          [√] 

├── .npmrc                          # pnpm配置             [√] 

├── pnpm-workspace.yaml             # workspace: apps/*, packages/* [√] 

├── package.json                    # 根package（脚本+devDeps） [√] 

├── turbo.json                      # Turborepo管道+缓存      [√] 

├── tsconfig.base.json              # 共享TS strict配置        [√] 

├── docker-compose.yml              # 开发Docker编排（6个容器） [√] 

├── docker-compose.prod.yml         # 生产Docker编排          [√] 

```

  

**apps/web/（5个文件）**:

```

apps/web/

├── package.json                    # Nuxt 3 + tailwindcss + pinia [√] 

├── nuxt.config.ts                  # SPA模式，SSR=false

├── tsconfig.json [√] 

├── app.vue                         # 根入口        [√] 

```

  

**apps/admin/（6个文件）**:

```

apps/admin/

├── package.json                    # Vue 3 + Vite + Ant Design Vue 4 [√] 

├── vite.config.ts [√] 

├── tsconfig.json / tsconfig.node.json [√] 

├── index.html [√] 

├── src/main.ts                     # 入口

├── src/App.vue

└── src/env.d.ts

```

  

**packages/server/（6个文件）**:

```

packages/server/

├── package.json                    # Nest.js + Prisma + Redis + MinIO + Bull + JWT

├── tsconfig.json / tsconfig.build.json

├── nest-cli.json

├── src/main.ts                     # 应用入口

├── src/app.module.ts               # 根模块

├── src/app.controller.ts           # 健康检查端点

└── src/app.service.ts

```

  

**packages/shared/（3个文件）**:

```

packages/shared/

├── package.json

├── tsconfig.json

└── src/index.ts                    # 空入口

```

  

**scripts/（5个脚本）**:

```

scripts/

├── dev-up.sh                       # docker compose up -d

├── dev-down.sh                     # docker compose down

├── db-migrate.sh                   # prisma migrate deploy

├── db-seed.sh                      # prisma db seed

└── clean.sh                        # 清理docker/cache

```

  

**.github/（2个workflow）**:

```

.github/workflows/

├── ci.yml                          # PR: lint → test → build

└── deploy-staging.yml             # develop合并: build → push → deploy

```

  

### 测试策略

- ESLint + Prettier: 全项目0 error/0 warning

- Turborepo `build`: 全量构建成功

- Docker冒烟: `curl` 验证6个容器全部healthy

  

### 检查点

- [ ] `pnpm install` 全项目无报错

- [ ] `turbo build` 全量构建成功

- [ ] `docker-compose up -d` 全部容器healthy

- [ ] `curl localhost:3100/api/health` 返回200

- [ ] CI pipeline绿灯

  

### 回滚

- Docker环境: `docker-compose down -v` 清理重建

- 依赖问题: `git checkout pnpm-lock.yaml` → `pnpm install`

  

---

  

## 三、Phase 1 — 数据层搭建（5人天）

  

### 目标

Prisma Schema落地10张表，完成Migration和Seed数据。

  

### 文件清单

  

```

packages/server/

├── prisma/

│   ├── schema.prisma                # 10张表完整定义

│   ├── migrations/

│   │   └── 20260518000000_init/

│   │       └── migration.sql

│   └── seed.ts                      # 超级管理员+配置+示例文档

├── src/

│   ├── prisma/

│   │   ├── prisma.module.ts         # @Global() Prisma模块

│   │   └── prisma.extension.ts      # 软删除中间件+分页helper+日志

│   └── common/types/

│       └── database.types.ts        # 数据库工具类型

```

  

### 10张表

  

| # | 表名 | 核心字段 | 特殊说明 |

|---|------|---------|---------|

| 1 | visitors | fingerprint(unique), ip, user_agent, first_seen_at | 浏览器指纹去重 |

| 2 | conversations | visitor_id, session_token(unique), status, source_page | 状态: active/closed/transferred |

| 3 | messages | conversation_id, role, content, intent, feedback | 按月RANGE分区 |

| 4 | admin_users | username(unique), password_hash, role(enum) | 角色: super_admin/customer_service/knowledge_admin |

| 5 | refresh_tokens | admin_user_id, token(unique), expires_at, revoked | JWT刷新令牌轮换 |

| 6 | knowledge_docs | title, file_type, file_path, status, version | 状态: processing/active/error/archived |

| 7 | knowledge_chunks | document_id, chunk_index, content, vector_id | UNIQUE(doc_id, chunk_index) |

| 8 | work_orders | conversation_id(unique), status, priority, assignee_id | 状态流转: pending→processing→resolved→closed |

| 9 | rate_limits | visitor_id, endpoint, count, window_start | 限流持久化（主逻辑在Redis） |

| 10 | system_configs | key(unique), value, type, description | 动态配置热更新 |

  

### 测试策略

- `prisma validate` 验证Schema

- 集成测试: Jest + Testcontainers 验证所有表CRUD

- Seed测试: 验证种子数据正确插入

  

### 回滚

- 开发环境: `prisma migrate reset`

- 生产环境: 每个Migration保留反向SQL脚本

  

---

  

## 四、Phase 2 — 基础设施服务（8人天）

  

### 目标

构建全部8个基础设施Service（Prisma/Redis/MinIO/Milvus/Dify/Embedding/Queue/SSE）。

  

### 文件清单（约25个文件）

  

```

packages/server/src/infrastructure/

├── prisma/

│   └── prisma.service.ts            # PrismaClient封装（连接管理+事务+优雅关机）

├── redis/

│   ├── redis.module.ts              # @Global() Redis模块

│   ├── redis.service.ts             # 缓存读写+分布式锁+ Pipeline

│   └── redis.health.ts              # PING健康检查

├── minio/

│   ├── minio.module.ts

│   ├── minio.service.ts             # 上传/下载/预签名URL/桶管理

│   └── minio.health.ts

├── milvus/

│   ├── milvus.module.ts

│   ├── milvus.service.ts            # 集合管理/向量插入/ANN检索/删除

│   └── milvus.health.ts

├── dify/

│   ├── dify.module.ts               # HttpModule注册

│   ├── dify.service.ts              # Dify API调用+熔断+重试+30s超时

│   ├── dify.types.ts                # 请求/响应TypeScript类型

│   └── dify.constants.ts            # API端点常量

├── embedding/

│   ├── embedding.module.ts

│   ├── embedding.service.ts         # BGE HTTP调用+批量(max 64条/批)+Redis缓存

│   └── embedding.types.ts

├── queue/

│   ├── queue.module.ts              # BullModule注册3个队列

│   ├── queue.service.ts             # addJob去重/getStatus/pause/clean

│   ├── queue.processors.ts          # 统一导出所有Processor

│   └── queues/

│       ├── knowledge.queue.ts       # 文档处理: 解析→分块→向量化→入库

│       ├── analytics.queue.ts       # 异步统计聚合

│       └── notification.queue.ts    # 通知队列（预留）

└── sse/

    ├── sse.module.ts

    ├── sse-manager.service.ts       # 连接池Map管理+注册/注销/广播/心跳/限流

    └── sse.types.ts

```

  

### 队列配置

  

| 队列 | 并发 | 超时 | 重试 | 说明 |

|------|------|------|------|------|

| document-process | 2 | 5min | 3 | CPU/GPU密集型 |

| cache-warmup | 5 | 2min | 2 | 缓存预热可并行 |

| analytics-report | 1 | 10min | 1 | 串行避免冲突 |

  

### 测试策略

- 单元测试: 8个Service覆盖率≥80%

- 集成测试: Jest + Testcontainers 真实连接验证

- Dify熔断器: 5次失败→熔断30s→半开→恢复/再熔断

  

### 回滚

- 各Service独立无耦合，问题模块回滚不影响其他

- Milvus向量数据: 通过备份脚本恢复

  

---

  

## 五、Phase 3 — 共享包与通用模块（5人天）

  

### 目标

构建shared类型包 + 后端公共中间件/过滤器/拦截器/守卫/管道。

  

### 文件清单（约35个文件）

  

**packages/shared/src/（12个文件）**:

```

packages/shared/src/

├── index.ts                         # 统一导出

├── types/

│   ├── api.types.ts                 # ApiResponse<T>, PaginatedResponse<T>

│   ├── conversation.types.ts        # 对话/消息类型

│   ├── knowledge.types.ts           # 知识文档/分块类型

│   ├── work-order.types.ts          # 工单类型

│   ├── admin.types.ts               # 管理员类型

│   ├── auth.types.ts                # JWT Payload, Login请求/响应

│   ├── analytics.types.ts           # 分析数据接口

│   └── system.types.ts              # 系统配置类型

├── constants/

│   ├── error-codes.ts               # 业务错误码枚举

│   └── business.constants.ts        # 业务常量

├── enums/

│   ├── conversation.enum.ts         # ConversationStatus, MessageRole

│   ├── knowledge.enum.ts            # KnowledgeDocStatus

│   ├── work-order.enum.ts           # WorkOrderStatus/Priority

│   └── admin.enum.ts                # AdminRole

└── utils/

    ├── validators.ts                # 共享验证函数

    └── formatters.ts                # 共享格式化函数

```

  

**packages/server/src/common/（约20个文件）**:

```

packages/server/src/common/

├── decorators/

│   ├── current-user.decorator.ts    # @CurrentUser()

│   ├── current-visitor.decorator.ts # @CurrentVisitor()

│   ├── public.decorator.ts          # @Public() 跳过JWT

│   ├── roles.decorator.ts           # @Roles('super_admin')

│   └── api-paginated.decorator.ts   # Swagger分页装饰器

├── guards/

│   ├── jwt-auth.guard.ts            # JWT全局守卫

│   ├── roles.guard.ts               # 角色权限守卫

│   └── visitor.guard.ts             # 访客识别守卫

├── interceptors/

│   ├── response-transform.interceptor.ts   # 统一响应{code,message,data}

│   ├── request-logging.interceptor.ts      # 请求日志

│   └── cache.interceptor.ts                # Redis响应缓存

├── filters/

│   ├── http-exception.filter.ts     # 全局异常→统一错误响应

│   └── prisma-exception.filter.ts   # Prisma错误→业务错误码

├── pipes/

│   ├── validation.pipe.ts           # class-validator全局管道

│   └── parse-object-id.pipe.ts      # UUID验证

├── middlewares/

│   ├── fingerprint.middleware.ts    # 浏览器指纹提取

│   ├── rate-limit.middleware.ts     # 滑动窗口限流（Redis Sorted Set）

│   └── cors-config.ts               # CORS白名单

├── dto/

│   ├── pagination.dto.ts            # 通用分页DTO

│   └── base-response.dto.ts         # 基础响应DTO

└── exceptions/

    ├── business.exception.ts        # 业务异常类

    └── error-codes.ts               # 错误码映射表

```

  

### 中间件链执行顺序（main.ts中注册）

```

1. requestIdMiddleware      → 注入X-Request-ID

2. requestLogMiddleware     → 请求日志

3. helmetMiddleware         → 安全Header

4. corsMiddleware           → CORS跨域

5. rateLimitMiddleware      → Redis滑动窗口限流

6. sessionParseMiddleware   → 解析鉴权Token

7. sensitiveWordMiddleware  → 敏感词过滤

8. bodyParserMiddleware     → Body解析(限1MB)

```

  

### 测试策略

- 单元测试: decorators/pipes/exceptions ≥90%

- 集成测试: guards/interceptors/filters/middlewares Mock请求验证

- 类型测试: `tsc --noEmit` 0 error

  

---

  

## 六、Phase 4 — 核心业务模块（上）（12人天）

  

### 目标

完成Auth + Gateway + Conversation + Agent四大模块，打通"访客提问→Agent响应"核心链路。

  

### 文件清单（约30个文件）

  

**modules/auth/（9个文件）**:

```

modules/auth/

├── auth.module.ts                   # JWT+Passport注册

├── auth.controller.ts               # login/register/refresh/logout/change-password

├── auth.service.ts                  # 验证bcrypt/签发JWT/refresh Rotation

├── auth.types.ts

├── dto/

│   ├── login.dto.ts                 # username + password

│   ├── register.dto.ts              # username + email + password

│   ├── refresh-token.dto.ts

│   └── change-password.dto.ts

├── strategies/

│   ├── jwt.strategy.ts              # Bearer Token提取验证

│   └── local.strategy.ts            # 用户名密码验证（仅login）

├── auth.service.spec.ts

```

  

**modules/gateway/（5个文件）**:

```

modules/gateway/

├── gateway.module.ts                # 导入SSE+Agent+Conversation

├── gateway.controller.ts            # GET /stream/:id (SSE端点)

├── gateway.service.ts               # handleIncomingMessage核心流程

├── dto/send-message.dto.ts

└── gateway.service.spec.ts

```

  

**modules/conversation/（10个文件）**:

```

modules/conversation/

├── conversation.module.ts

├── conversation.controller.ts       # CRUD + 转人工

├── conversation.service.ts          # 对话生命周期管理

├── context-manager.service.ts       # 上下文组装+滑动窗口截断

├── message.service.ts               # 消息CRUD+分区写入路由

├── dto/

│   ├── create-conversation.dto.ts

│   ├── list-conversation.dto.ts

│   ├── update-conversation.dto.ts

│   ├── conversation-response.dto.ts

│   └── list-message.dto.ts

├── conversation.service.spec.ts

├── context-manager.service.spec.ts

```

  

**modules/agent/（7个文件）**:

```

modules/agent/

├── agent.module.ts                  # 导入Dify+Milvus+Embedding+Redis

├── agent.controller.ts              # POST /test (调试) + GET/PUT /config

├── agent.service.ts                 # 核心调度: 意图→检索→Dify→合成

├── circuit-breaker.service.ts       # 状态机: CLOSED→OPEN→HALF_OPEN

├── intent-resolver.service.ts       # 关键词规则意图识别

├── dto/

│   ├── agent-chat.dto.ts

│   └── agent-config.dto.ts

├── agent.service.spec.ts

├── circuit-breaker.service.spec.ts

```

  

### 核心数据流

```

访客发消息 → GatewayController(POST /chat/send)

  → GatewayService.handleIncomingMessage()

    → MessageService.create() 存储用户消息

    → ContextManagerService.buildContext() 组装上下文

    → AgentService.chat()

      → IntentResolverService.resolve() 意图识别

      → EmbeddingService.embed() 问题向量化

      → MilvusService.search() 向量检索

      → DifyClientService.chatStream() 调用Dify (SSE流式)

      → 逐Token通过SSEManagerService 推送前端

      → MessageService.create() 存储完整AI响应

```

  

### 测试策略

- 单元测试: auth/agent/conversation/context-manager覆盖率≥80%

- Controller E2E: Jest + supertest 全部API端点

- SSE集成: EventSource连接建立/推送/断开清理

  

### 检查点

- [ ] 登录→JWT签发→refresh→登出全流程

- [ ] JWT守卫+角色守卫联合验证

- [ ] 创建对话→发消息→SSE流式接收→消息存储 全链路

- [ ] Dify熔断器状态机转换正确

- [ ] 上下文管理器滑动窗口截断正确

  

---

  

## 七、Phase 5 — 核心业务模块（下）（10人天）

  

### 目标

完成Knowledge + WorkOrder + Analytics + System四大模块。

  

### 文件清单（约35个文件）

  

**modules/knowledge/（14个文件）**:

```

modules/knowledge/

├── knowledge.module.ts

├── knowledge.controller.ts          # 上传/列表/详情/删除/重处理/检索

├── knowledge.service.ts             # 文档生命周期管理

├── dto/

│   ├── upload-doc.dto.ts

│   ├── list-doc.dto.ts

│   ├── update-doc.dto.ts

│   ├── search-knowledge.dto.ts

│   └── doc-response.dto.ts

├── services/

│   ├── document-parser.service.ts   # PDF/DOCX/MD/TXT/CSV→纯文本

│   ├── chunk-splitter.service.ts    # 语义分块(512 tokens + 64 overlap)

│   ├── vector-indexer.service.ts    # 批量Embedding+Milvus写入

│   └── knowledge-retriever.service.ts  # 混合检索(向量ANN+BM25+Reranker)

├── knowledge.service.spec.ts

├── document-parser.service.spec.ts

├── chunk-splitter.service.spec.ts

└── knowledge-retriever.service.spec.ts

```

  

**modules/work-order/（6个文件）**:

```

modules/work-order/

├── work-order.module.ts

├── work-order.controller.ts         # CRUD + stats

├── work-order.service.ts            # 状态流转: pending→processing→resolved→closed

├── dto/

│   ├── create-work-order.dto.ts

│   ├── update-work-order.dto.ts

│   ├── list-work-order.dto.ts

│   └── work-order-response.dto.ts

└── work-order.service.spec.ts

```

  

**modules/analytics/（7个文件）**:

```

modules/analytics/

├── analytics.module.ts

├── analytics.controller.ts          # dashboard/conversations/knowledge/agent统计

├── analytics.service.ts             # 实时(Redis)+历史(PostgreSQL)聚合

├── dto/

│   ├── dashboard.dto.ts

│   ├── conversation-stats.dto.ts

│   ├── knowledge-stats.dto.ts

│   └── agent-performance.dto.ts

└── analytics.service.spec.ts

```

  

**modules/system/（8个文件）**:

```

modules/system/

├── system.module.ts

├── system.controller.ts             # 配置CRUD / 缓存管理 / 用户管理

├── system.service.ts                # 配置热更新+缓存刷新

├── health.controller.ts             # 综合健康检查(6个依赖)

├── dto/

│   ├── config.dto.ts

│   └── health.dto.ts

└── system.service.spec.ts

```

  

### 知识文档处理管道

```

上传 → MinIO → knowledge_docs(status=processing)

  → Queue: knowledge-queue

    → document-parser: 文件→纯文本

    → chunk-splitter: 文本→分块数组

    → knowledge_chunks表写入

    → vector-indexer: 分块→Embedding→Milvus

    → knowledge_docs(status=completed)

  → 失败 → status=failed + 错误日志

```

  

### 测试策略

- 单元测试: 4个模块Service覆盖率≥80%

- 集成测试: 文档上传→处理→检索全链路

- 检索质量测试: 命中率≥85%, MRR评估

  

---

  

## 八、Phase 6 — 官网前端开发（12人天）

  

### 目标

完成Nuxt 3官网前端：悬浮聊天气泡 + 独立聊天页 + SSE流式集成。

  

### 文件清单（约30个文件）

  

```

apps/web/

├── nuxt.config.ts                   # SPA模式 + Pinia + Tailwind + API代理

├── tailwind.config.ts               # 品牌色: 主色#1a56db冷蓝 + 辅色#f59e0b暖金

├── app.vue / error.vue / app.config.ts

├── assets/

│   ├── css/

│   │   ├── main.css                 # Tailwind directives

│   │   ├── chat-bubble.css          # 气泡动画样式

│   │   └── animation.css            # 弹入/滑入动画

│   └── images/

│       ├── logo.svg                 # 企业Logo

│       ├── chat-icon.svg            # 聊天气泡图标

│       └── bot-avatar.svg           # AI客服头像

├── composables/

│   ├── useChat.ts                   # 核心: sendMessage + messages + SSE

│   ├── useSSE.ts                    # EventSource封装+自动重连(3次指数退避)

│   ├── useVisitor.ts                # 指纹生成+localStorage存储+注册

│   ├── useScrollToBottom.ts         # 自动滚动(用户上滑时不滚)

│   └── useTyping.ts                 # 打字机效果(60ms/字)

├── components/

│   ├── chat/

│   │   ├── ChatBubble.vue           # 右下角固定悬浮按钮(56×56px)

│   │   ├── ChatWindow.vue           # 窗口容器(380×560px, 移动端全屏)

│   │   ├── ChatHeader.vue           # 头部: Logo + 在线状态 + 最小化/关闭

│   │   ├── ChatMessageList.vue      # 虚拟滚动消息列表

│   │   ├── ChatMessageItem.vue      # 单条消息: 用户(蓝底右)/AI(白底左)

│   │   ├── ChatInput.vue            # 输入框 + 发送按钮

│   │   ├── ChatTypingIndicator.vue  # AI输入中三点动画

│   │   ├── ChatQuickQuestions.vue   # 快捷问题推荐(从配置获取)

│   │   ├── ChatSatisfaction.vue     # 满意度评价(👍/👎)

│   │   └── ChatTransferConfirm.vue  # 转人工确认弹窗

│   └── common/

│       └── MarkdownRenderer.vue     # marked + highlight.js + XSS过滤

├── pages/

│   ├── index.vue                    # 官网首页(含ChatBubble)

│   └── chat/index.vue               # 独立全屏聊天页

├── stores/

│   └── chat.store.ts                # Pinia: conversations/messages/isOpen/isTyping

├── middleware/

│   └── visitor.global.ts            # 全局: 自动注册/识别访客

├── plugins/

│   └── ant-design-vue.client.ts     # AntDV按需引入

├── utils/

│   ├── fingerprint.ts               # Canvas+WebGL+字体综合指纹(64位hash)

│   ├── markdown.ts                  # Markdown解析配置

│   └── format.ts                    # 时间格式化

└── types/

    └── chat.types.ts                # 聊天前端类型

```

  

### SSE消息协议

```

event: message

data: {"type":"token","content":"新鼎","conversationId":"uuid"}

  

event: message

data: {"type":"done","messageId":"uuid","tokenCount":156,"sources":[...]}

  

event: message

data: {"type":"error","code":"AGENT_TIMEOUT","message":"AI响应超时"}

  

event: heartbeat

data: {"timestamp":"2026-05-17T10:30:00Z"}

```

  

### 测试策略

- 组件单元测试: Vitest + @vue/test-utils 覆盖率≥70%

- Composable测试: useChat/useSSE/useVisitor/useTyping 覆盖率≥80%

- E2E: Playwright 3个核心场景（打开气泡→发消息→接收SSE→评价）

- 响应式: 手机/平板/桌面3种视口

  

### 检查点

- [ ] 悬浮气泡在Chrome/Firefox/Edge/Safari正常

- [ ] 发送消息→SSE流式→打字机渲染全流程

- [ ] 刷新后消息历史正确恢复

- [ ] Markdown渲染正确（标题/列表/代码/表格/链接）

- [ ] 移动端375px宽度适配

- [ ] Lighthouse ≥80

  

---

  

## 九、Phase 7 — 管理后台开发（14人天）

  

### 目标

完成Vue 3 + Ant Design Vue管理后台全部12个页面。

  

### 文件清单（约50个文件）

  

**核心框架（10个文件）**:

```

apps/admin/src/

├── main.ts                          # 入口: Pinia+Router+AntDV

├── App.vue / env.d.ts

├── router/

│   ├── index.ts                     # 路由守卫: 未登录→/login, 角色不匹配→403

│   └── routes.ts                    # 12个路由定义+meta.roles

├── stores/

│   ├── auth.store.ts                # login/user/token/refresh

│   ├── app.store.ts                 # 侧边栏/主题/语言

│   └── notification.store.ts        # WebSocket通知

├── api/

│   ├── request.ts                   # axios封装(baseURL+拦截器+Token刷新)

│   ├── auth.api.ts

│   ├── conversation.api.ts

│   ├── knowledge.api.ts

│   ├── work-order.api.ts

│   ├── analytics.api.ts

│   ├── agent.api.ts

│   └── system.api.ts

├── composables/

│   ├── useAuth.ts / usePagination.ts / useTable.ts / usePermission.ts

```

  

**布局组件（5个文件）**:

```

├── layouts/

│   ├── DefaultLayout.vue            # 侧边栏+顶栏+内容区

│   ├── BlankLayout.vue              # 登录页用

│   └── components/

│       ├── Sidebar.vue              # 动态菜单(按角色生成)

│       ├── Header.vue               # 面包屑+用户下拉+通知

│       └── Footer.vue

```

  

**页面视图（12个页面文件）**:

```

├── views/

│   ├── login/LoginPage.vue          # 用户名+密码+登录

│   ├── dashboard/DashboardPage.vue   # 4张StatCard + 趋势图 + 热问列表

│   ├── conversation/

│   │   ├── ConversationList.vue     # 表格+搜索+筛选+分页

│   │   └── ConversationDetail.vue   # 消息时间线+访客信息

│   ├── knowledge/

│   │   ├── KnowledgeList.vue        # 分类树+表格+批量操作

│   │   ├── KnowledgeUpload.vue      # 拖拽上传+处理进度

│   │   └── KnowledgePreview.vue     # 文档原文+分块+检索测试

│   ├── work-order/

│   │   ├── WorkOrderList.vue        # 状态/优先级筛选+分配

│   │   └── WorkOrderDetail.vue      # 关联对话+处理表单+流转日志

│   ├── agent/AgentConfig.vue        # System Prompt编辑+参数+测试

│   └── system/

│       ├── SystemSettings.vue       # 配置表+缓存管理

│       └── AdminUsers.vue           # 管理员列表+新增/编辑/角色

```

  

**通用组件（8个文件）**:

```

├── components/

│   ├── common/

│   │   ├── StatCard.vue             # 统计卡片(标题/数值/趋势)

│   │   ├── TrendChart.vue           # ECharts折线图封装

│   │   ├── PieChart.vue             # ECharts饼图封装

│   │   ├── StatusTag.vue            # 状态标签(不同颜色)

│   │   ├── JsonViewer.vue           # JSON查看器

│   │   ├── FileUpload.vue           # 拖拽+预览+进度

│   │   └── ConfirmAction.vue        # 操作确认弹窗

│   └── conversation/

│       ├── MessageTimeline.vue      # 对话时间线展示

│       └── VisitorInfoCard.vue      # 访客信息卡片

```

  

### E2E测试场景（8个）

1. 管理员登录→看板→查看统计数据

2. 对话列表→筛选→详情→消息时间线

3. 知识库→上传PDF→处理完成→预览→检索测试

4. 工单→创建→分配→处理→解决→关闭

5. Agent配置→修改Prompt→测试对话

6. 系统设置→修改配置→保存→确认生效

7. 管理员管理→新增用户→分配角色→权限验证

8. viewer角色→受限页面→403

  

### 检查点

- [ ] 全部12个页面正常访问

- [ ] 登录/Token刷新/登出全流程

- [ ] 看板数据与数据库一致

- [ ] 知识上传→处理→检索全链路

- [ ] 工单状态流转正确

- [ ] 不同角色菜单和按钮权限正确

- [ ] 8个E2E场景全部通过

  

---

  

## 十、Phase 8 — 集成测试与性能优化（10人天）

  

### 测试框架总览

  

| 层级 | 框架 | 目标 |

|------|------|------|

| 后端单元测试 | Jest | 覆盖率≥80% |

| 后端Controller | Jest + supertest | 覆盖率≥90% |

| 前端组件 | Vitest + @vue/test-utils | 覆盖率≥70% |

| 前端Composable | Vitest | 覆盖率≥80% |

| E2E | Playwright | 14个场景 |

| 压力测试 | k6 | 10项指标达标 |

| 安全扫描 | npm audit + OWASP ZAP | 0 high/critical |

  

### 性能优化清单（6项）

  

| # | 优化项 | 策略 | 预期收益 |

|---|--------|------|---------|

| 1 | 知识检索缓存 | query hash→Redis get | 重复命中≥60%, 延迟200ms→5ms |

| 2 | 数据库索引 | 复合索引: conversationId+createdAt | 查询性能提升50% |

| 3 | Embedding批量 | batch=32条/次调用BGE | 减少HTTP往返 |

| 4 | 前端优化 | Nuxt SSR预渲染+虚拟滚动+懒加载 | Lighthouse ≥80 |

| 5 | SSE优化 | HTTP/2+gzip+KeepAlive | 连接效率提升 |

| 6 | Milvus索引 | IVF_FLAT(nlist=1024)+定期compact | 检索延迟降低 |

  

### 性能指标

  

| 指标 | 目标 | 测试方法 |

|------|------|---------|

| 首包延迟(TTFB) | <3s | k6 100并发 |

| API P95延迟 | <500ms | k6 5分钟负载 |

| SSE消息推送延迟 | <200ms/token | 计时统计 |

| 知识检索P95 | <500ms | k6 50并发 |

| SSE并发连接 | >500 | k6 SSE测试 |

| 前端Lighthouse | >80 | Lighthouse CLI |

  

### E2E测试场景（14个）

  

| 编号 | 场景 | 预期 |

|------|------|------|

| E2E-01 | 官网→气泡→发消息→SSE响应 | 流式生成完成 |

| E2E-02 | 20轮长对话→上下文截断 | 前10轮截断 |

| E2E-03 | 网络断线→SSE自动重连 | 3次重试后提示 |

| E2E-04 | 特殊字符/emoji/超长消息 | 不崩溃 |

| E2E-05 | 知识检索→引用来源 | 来源链接可点击 |

| E2E-06 | 转人工→工单创建 | 用户收到确认 |

| E2E-07 | 管理员全部功能 | 看板→对话→知识→工单→系统 |

| E2E-08 | 知识文档上传→检索验证 | 上传→索引→可检索 |

| E2E-09 | Agent配置→对话测试 | 新Prompt生效 |

| E2E-10 | viewer权限限制 | 无法修改/删除 |

| E2E-11 | 100并发同时对话 | 无超时/无丢失 |

| E2E-12 | 10万chunks检索 | 延迟<500ms |

| E2E-13 | Token过期→自动刷新 | 用户无感知 |

| E2E-14 | 数据库连接池耗尽→恢复 | 自动恢复 |

  

---

  

## 十一、Phase 9 — 部署与上线（8人天）

  

### 文件清单（约20个文件）

  

```

xd-smart-cs/

├── Dockerfile.server                # 后端多阶段构建(node:20-alpine)

├── Dockerfile.web                   # 前端生产镜像(nginx+静态文件)

├── Dockerfile.admin                 # 管理后台生产镜像

├── Dockerfile.bge                   # BGE Embedding微服务

├── nginx/

│   ├── nginx.conf                   # 反向代理+HTTPS+HTTP/2+限流

│   ├── conf.d/

│   │   ├── web.conf                 # 官网虚拟主机

│   │   ├── admin.conf               # 管理后台虚拟主机

│   │   └── api.conf                 # API反向代理(proxy_read_timeout 600s)

│   └── ssl/.gitkeep

├── scripts/

│   ├── deploy-prod.sh               # docker compose pull+up

│   ├── rollback.sh                  # 切回上一版本tag

│   ├── backup-db.sh                 # pg_dump→MinIO

│   ├── backup-milvus.sh             # Milvus向量备份

│   ├── health-check.sh              # 部署后健康验证

│   └── seed-production.sh           # 生产初始数据

├── docs/

│   ├── deployment.md                # 部署手册

│   ├── operations.md                # 运维手册

│   ├── troubleshooting.md           # 问题排查指南

│   └── api-reference.md             # API文档

├── .github/workflows/

│   ├── deploy-prod.yml              # 生产CI/CD（手动触发+审批）

│   └── rollback.yml                 # 回滚CI/CD

└── monitoring/

    ├── prometheus.yml               # 采集配置

    ├── alert-rules.yml              # 告警规则

    ├── grafana/dashboards/

    │   ├── system-overview.json     # 系统整体面板

    │   ├── api-metrics.json         # API性能面板

    │   └── business-metrics.json    # 业务指标面板

    └── docker-compose.monitoring.yml # Prometheus+Grafana+AlertManager

```

  

### 灰度发布流程

```

Step 1: 合并到develop → CI通过

Step 2: release/v1.0.0分支 → 部署Staging

Step 3: Staging冒烟(14个E2E)

Step 4: 审批 → 合并main → 打tag v1.0.0

Step 5: 构建Docker镜像 → 推送Registry

Step 6: 灰度10%流量(30分钟观察)

Step 7: 灰度50%(15分钟观察)

Step 8: 100%全量

```

  

### 回滚策略总表

  

| 回滚对象 | 方法 | RTO | RPO |

|---------|------|-----|-----|

| Docker镜像 | `docker-compose up -d` 切回上一tag | <5min | 0 |

| 数据库Migration | 执行反向Migration SQL | <10min | 0 |

| 知识库向量 | `backup-milvus.sh` 恢复 | <30min | 上次备份 |

| MinIO文件 | Bucket版本控制+备份恢复 | <30min | 上次备份 |

| 完整系统 | `rollback.sh` 一键切回 | <15min | 0 |

  

### 监控告警

  

| 告警 | 条件 | 级别 | 通知 |

|------|------|------|------|

| API响应过高 | P95>3s持续5min | Warning | 企微/钉钉 |

| API错误率过高 | 5xx>5%持续1min | Critical | 企微+电话 |

| Dify不可用 | 连续3次健康检查失败 | Critical | 企微+电话 |

| Redis内存>80% | used_memory>80% | Warning | 企微 |

| 磁盘>85% | disk usage>85% | Warning | 企微 |

| 容器异常退出 | status=exited | Critical | 企微+电话 |

  

---

  

## 十二、风险识别与缓解

  

### 技术风险

  

| # | 风险 | 影响 | 概率 | 缓解 |

|---|------|------|------|------|

| R1 | Dify社区版不稳定，API偶发超时 | 高 | 中 | 3次重试+熔断+降级为直接知识库检索 |

| R2 | BGE Embedding延迟>2s/次 | 高 | 中 | GPU加速+Redis缓存embedding+batch=32 |

| R3 | Milvus Lite 10万+向量后性能降 | 中 | 低 | 按知识分类分Collection+提前压测 |

| R4 | DeepSeek API外部依赖不稳定 | 高 | 低 | 熔断降级+备用模型切换配置 |

| R5 | PostgreSQL按月分区跨月查询性能 | 中 | 低 | 分区裁剪验证+热数据Redis缓存 |

| R6 | SSE在Nginx后超时断开 | 中 | 中 | proxy_read_timeout 600s+30s心跳+自动重连 |

  

### 进度风险

  

| # | 风险 | 影响 | 概率 | 缓解 |

|---|------|------|------|------|

| R7 | 2人团队人员变动 | 高 | 低 | shared types先行约定+关键模块文档化 |

| R8 | Dify集成复杂度被低估 | 中 | 中 | 渐进策略: 基础对话→Tool→Workflow |

| R9 | RAG命中率不达标需反复调优 | 中 | 中 | 预准备测试集+分块策略可配置+混合检索 |

  

---

  

## 十三、时间估算与关键路径

  

| Phase | 内容 | 前端(天) | 后端(天) | 交叉(天) | 小计 |

|-------|------|---------|---------|---------|------|

| 0 | 环境搭建 | 3 | 3 | 2 | 8 |

| 1 | 数据层 | 1 | 4 | 0 | 5 |

| 2 | 基础设施服务 | 0 | 8 | 0 | 8 |

| 3 | 共享包+通用模块 | 2 | 3 | 1 | 6 |

| 4 | 核心业务(上) | 4 | 8 | 2 | 14 |

| 5 | 核心业务(下) | 0 | 10 | 0 | 10 |

| 6 | 官网前端 | 12 | 0 | 2 | 14 |

| 7 | 管理后台 | 14 | 0 | 2 | 16 |

| 8 | 集成测试 | 3 | 5 | 2 | 10 |

| 9 | 部署上线 | 2 | 4 | 2 | 8 |

| **总计** | | **41** | **45** | **13** | **99** |

  

### 关键路径（后端为主）

```

Phase 0 → 1 → 2 → 3 → 4 → 5 → 8 → 9 = ~59人天

前端Phase 6/7与后端Phase 4/5可并行

总日历时间: 约10-12周

```

  

### 里程碑

```

Week 1-2:  Phase 0+1 → 里程碑0: 环境可运行

Week 3-4:  Phase 2+3 → 里程碑1: API可调用

Week 5-6:  Phase 4   → 里程碑2: 核心链路打通

Week 7-8:  Phase 5+6 → 里程碑3: 知识库+官网可用

Week 9-10: Phase 7   → 里程碑4: 管理后台完成

Week 11:   Phase 8   → 里程碑5: 性能达标

Week 12:   Phase 9   → 里程碑6: 正式上线

```

  

---

  

## 十四、验证方案

  

### 每个Phase完成后的验证

  

1. **Phase 0**: `docker-compose up -d` 全部容器healthy + `curl` 各端点返回200

2. **Phase 1**: `prisma migrate deploy` 成功 + seed数据正确插入

3. **Phase 2**: 8个Service集成测试全部通过（真实连接验证）

4. **Phase 3**: `tsc --noEmit` 0 error + 守卫/拦截器/过滤器集成测试通过

5. **Phase 4**: 发消息→SSE流式接收全链路E2E通过

6. **Phase 5**: 文档上传→处理→检索→缓存命中全链路通过

7. **Phase 6**: Playwright E2E 3个场景通过 + Lighthouse≥80

8. **Phase 7**: Playwright E2E 8个场景通过 + 权限验证通过

9. **Phase 8**: 后端覆盖率≥80% + 前端覆盖率≥70% + 10项性能指标达标

10. **Phase 9**: 灰度发布验证 + 7×24h稳定性监控

  

### 上线前最终验证清单

  

- [ ] 14个E2E场景全部通过

- [ ] 首包延迟P95<3s

- [ ] 知识检索P95<500ms

- [ ] SSE并发500连接稳定1h

- [ ] RAG检索命中率≥85%

- [ ] Agent自助解决率≥70%

- [ ] 全部容器healthy

- [ ] Prometheus+Grafana监控正常

- [ ] 告警规则触发验证通过

- [ ] 备份+恢复脚本验证通过

- [ ] 回滚脚本验证通过

- [ ] SSL证书配置正确

- [ ] 文档（部署手册+运维手册+API文档）齐全