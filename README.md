# XD-Agent-RAG-2026 — 新鼎电炉科技智能客服系统

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="version">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen" alt="node">
  <img src="https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange" alt="pnpm">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/build-CI%2FCD-blueviolet" alt="build">
</p>

## 目录

- [项目简介](#项目简介)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [数据库设计](#数据库设计)
- [API接口概览](#api接口概览)
- [Redis缓存设计](#redis缓存设计)
- [部署指南](#部署指南)
- [开发规范](#开发规范)
- [测试策略](#测试策略)
- [性能指标](#性能指标)
- [里程碑](#里程碑)
- [团队](#团队)
- [许可证](#许可证)

---

## 项目简介

**XD-Agent-RAG-2026** 是新鼎电炉科技面向工业制造领域的企业级智能客服系统。系统以 **RAG（检索增强生成）** 技术为核心，结合大语言模型（DeepSeek-V3）与 Dify 工作流引擎，为访客提供产品咨询、选型推荐、故障排查等智能化服务。

### 核心能力

| 能力 | 说明 |
|------|------|
| **智能问答** | 基于RAG架构，从企业知识库中检索并生成准确回答 |
| **流式响应** | SSE实时推送，打字机效果逐字渲染，首包延迟 < 3s |
| **多轮对话** | 滑动窗口上下文管理 + 自动摘要，支持长对话 Token 预算控制 |
| **意图识别** | 自动识别产品咨询 / 询价 / 售后 / 闲聊，按意图分流处理 |
| **转人工** | 置信度低于阈值自动提示转人工，AI对话摘要→工单创建 |
| **知识库管理** | 支持 PDF/Word/Excel/Markdown 多格式文档上传，自动解析分块向量化 |
| **数据看板** | 实时统计会话量、意图分布、热问排行、未命中监测 |
| **限流降级** | Redis滑动窗口限流 + 熔断器 + 多级降级策略，保障系统稳定 |
| **页面感知** | 根据访客所在页面（产品详情/解决方案/售后支持）提供上下文感知的建议问题 |

### 适用场景

- 电炉设备产品咨询与选型推荐
- 技术参数查询与对比
- 售后故障排查引导
- 询价与商务对接

---

## 技术架构

### 架构总览

```
┌────────────────────────────────────────────────────────────┐
│                    客户端层 (Client)                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │  Nuxt 3 官网前端 (SPA)   │  │  Vue 3 管理后台          │ │
│  │  Tailwind CSS + Pinia    │  │  Ant Design Vue 4       │ │
│  │  悬浮聊天气泡 + 独立聊天页 │  │  12个管理页面            │ │
│  └────────────┬────────────┘  └───────────┬─────────────┘ │
└───────────────┼─────────────────────────────┼───────────────┘
                │                             │
        ┌───────┴───────────┐       ┌────────┴──────────┐
        │  Nginx 反向代理    │       │  JWT Auth         │
        │  HTTPS / HTTP/2   │       │  Session Token    │
        └───────┬───────────┘       └────────┬──────────┘
                │                             │
┌───────────────┴─────────────────────────────┴───────────────┐
│                      服务层 (Server)                         │
│                       Nest.js 11.x                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Auth     │ │ Gateway  │ │Conversat.│ │ Agent (Dify) │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Knowledge │ │WorkOrder │ │Analytics │ │ System       │  │
│  │ Module   │ │ Module   │ │ Module   │ │ Module       │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│                    基础设施层 (Infrastructure)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │PostgreSQL│ │ Redis 7  │ │ Milvus   │ │ MinIO        │  │
│  │ 主数据库  │ │ 缓存/限流 │ │ 向量检索  │ │ 文件存储     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ Dify     │ │ DeepSeek │ │ BGE      │ │ Bull Queue   │  │
│  │ 工作流引擎 │ │ LLM      │ │Embedding │ │ 异步任务     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **包管理** | pnpm + Turborepo (Monorepo) | pnpm 9.x |
| **后端框架** | Nest.js | 11.x |
| **ORM** | Prisma | 5.x |
| **前端框架（官网）** | Nuxt 3 (Vue 3 + TypeScript) | 3.x |
| **前端框架（后台）** | Vue 3 + Vite + Ant Design Vue 4 | — |
| **样式** | Tailwind CSS | 3.x |
| **状态管理** | Pinia | 2.x |
| **数据库** | PostgreSQL | 15 |
| **缓存** | Redis | 7 |
| **向量数据库** | Milvus (Standalone) | 2.4 |
| **对象存储** | MinIO | latest |
| **AI引擎** | Dify 社区版 + DeepSeek-V3 | 0.11 |
| **Embedding** | BGE-large-zh-v1.5 (本地部署) | — |
| **任务队列** | Bull (基于Redis) | 4.x |
| **实时通信** | SSE (Server-Sent Events) | — |
| **容器化** | Docker + Docker Compose | — |
| **CI/CD** | GitHub Actions | — |

---

## 项目结构

```
xd-smart-cs/
├── .github/workflows/
│   └── ci.yml                         # CI流水线（lint → typecheck → build → test）
├── apps/
│   ├── web/                           # 官网前端 (Nuxt 3 SPA)
│   │   ├── components/
│   │   │   ├── chat/                  # 聊天组件（12个）
│   │   │   │   ├── ChatBubble.vue     #   悬浮触发按钮
│   │   │   │   ├── ChatWindow.vue     #   聊天窗口容器
│   │   │   │   ├── ChatHeader.vue     #   窗口头部
│   │   │   │   ├── ChatMessageList.vue#   消息列表（虚拟滚动）
│   │   │   │   ├── ChatMessageItem.vue#   单条消息
│   │   │   │   ├── ChatInput.vue      #   输入框
│   │   │   │   ├── ChatTypingIndicator.vue # 打字中动画
│   │   │   │   ├── ChatQuickQuestions.vue  # 快捷问题
│   │   │   │   ├── ChatSatisfaction.vue    # 满意度评价
│   │   │   │   └── ChatTransferConfirm.vue # 转人工确认
│   │   │   └── common/
│   │   │       └── MarkdownRenderer.vue    # Markdown渲染（marked + highlight.js）
│   │   ├── composables/
│   │   │   ├── useChat.ts             # 核心聊天逻辑
│   │   │   ├── useSSE.ts              # SSE连接管理（自动重连+指数退避）
│   │   │   ├── useVisitor.ts          # 访客指纹生成+识别
│   │   │   ├── useScrollToBottom.ts   # 自动滚动
│   │   │   └── useTyping.ts           # 打字机效果
│   │   ├── pages/
│   │   │   ├── index.vue              # 官网首页
│   │   │   ├── products.vue           # 产品列表页
│   │   │   ├── solutions.vue          # 解决方案页
│   │   │   ├── about.vue              # 关于我们
│   │   │   └── chat/index.vue         # 独立全屏聊天页
│   │   ├── stores/chat.store.ts       # Pinia聊天状态
│   │   ├── middleware/visitor.global.ts # 全局访客中间件
│   │   ├── utils/
│   │   │   ├── fingerprint.ts         # 浏览器综合指纹（Canvas+WebGL+字体→SHA256）
│   │   │   ├── markdown.ts            # Markdown解析配置
│   │   │   └── format.ts              # 时间格式化
│   │   └── e2e/chat.spec.ts           # Playwright E2E测试
│   │
│   └── admin/                         # 管理后台 (Vue 3 + Ant Design Vue 4)
│       ├── src/
│       │   ├── views/
│       │   │   ├── login/LoginPage.vue          # 登录页
│       │   │   ├── dashboard/DashboardPage.vue  # 数据看板（ECharts图表）
│       │   │   ├── conversation/
│       │   │   │   ├── ConversationList.vue     # 对话列表
│       │   │   │   └── ConversationDetail.vue   # 对话详情（消息时间线）
│       │   │   ├── knowledge/
│       │   │   │   ├── KnowledgeList.vue        # 知识库列表
│       │   │   │   ├── KnowledgeUpload.vue      # 文档上传（拖拽+进度）
│       │   │   │   └── KnowledgePreview.vue     # 文档预览+检索测试
│       │   │   ├── work-order/
│       │   │   │   ├── WorkOrderList.vue        # 工单列表
│       │   │   │   └── WorkOrderDetail.vue      # 工单详情
│       │   │   ├── agent/AgentConfig.vue        # Agent行为配置
│       │   │   └── system/SystemSettings.vue    # 系统设置（super_admin）
│       │   ├── api/                   # API请求封装（axios + 拦截器+ Token刷新）
│       │   ├── components/common/     # 通用组件
│       │   │   ├── StatCard.vue       #   统计卡片
│       │   │   ├── StatusTag.vue      #   状态标签
│       │   │   ├── FileUpload.vue     #   文件上传
│       │   │   └── ConfirmAction.vue  #   确认弹窗
│       │   ├── stores/                # Pinia状态（auth / app）
│       │   ├── composables/           # usePagination / usePermission
│       │   └── router/                # 路由守卫+角色权限
│       └── vite.config.ts
│
├── packages/
│   ├── server/                        # 后端服务 (Nest.js)
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # 10张表完整定义
│   │   │   ├── migrations/            # 数据库迁移文件
│   │   │   └── seed.ts                # 初始数据（管理员+系统配置）
│   │   └── src/
│   │       ├── main.ts                # 应用入口（中间件链注册）
│   │       ├── app.module.ts          # 根模块
│   │       ├── common/                # 通用模块
│   │       │   ├── guards/            #   JWT守卫 / 角色守卫 / 访客守卫
│   │       │   ├── interceptors/      #   响应转换 / 请求日志 / 缓存拦截器
│   │       │   ├── filters/           #   HTTP异常 / Prisma异常 过滤器
│   │       │   ├── decorators/        #   @CurrentUser / @Roles / @Public
│   │       │   ├── pipes/             #   验证管道 / UUID管道
│   │       │   ├── middlewares/       #   指纹提取 / 滑动窗口限流 / CORS
│   │       │   └── exceptions/        #   业务异常类
│   │       ├── infrastructure/        # 基础设施服务
│   │       │   ├── prisma/            #   PrismaClient封装（连接管理+事务+优雅关机）
│   │       │   ├── redis/             #   Redis服务（缓存+分布式锁+Pipeline）
│   │       │   ├── minio/             #   MinIO服务（上传/下载/预签名URL/桶管理）
│   │       │   ├── milvus/            #   Milvus服务（集合管理/ANN检索）
│   │       │   ├── dify/              #   Dify客户端（熔断+重试+30s超时）
│   │       │   ├── embedding/         #   BGE Embedding服务（批量64条+Redis缓存）
│   │       │   ├── queue/             #   Bull队列（文档处理/分析报表/通知）
│   │       │   └── sse/               #   SSE连接池（注册/注销/广播/心跳/限流）
│   │       ├── modules/               # 业务模块
│   │       │   ├── auth/              #   认证鉴权（JWT+Session）
│   │       │   ├── gateway/           #   SSE网关（消息入口+流式推送）
│   │       │   ├── conversation/      #   对话管理（CRUD+上下文管理+消息存储）
│   │       │   ├── agent/             #   Agent调度（意图识别→检索→Dify→合成）
│   │       │   ├── knowledge/         #   知识库（文档解析/分块/向量化/混合检索）
│   │       │   ├── work-order/        #   工单管理（状态流转+分配）
│   │       │   ├── analytics/         #   数据分析（实时+历史聚合）
│   │       │   └── system/            #   系统管理（配置热更新+健康检查）
│   │       └── config/                # 应用配置
│   └── shared/                        # 共享类型包
│       └── src/
│           ├── types/                 # 业务类型定义（8个领域）
│           ├── enums/                 # 枚举定义（对话/知识库/工单/管理员）
│           ├── constants/             # 错误码 + 业务常量
│           └── utils/                 # 共享验证 + 格式化
│
├── scripts/
│   ├── dev-up.sh                     # 启动Docker基础设施
│   ├── dev-down.sh                   # 停止Docker基础设施
│   ├── db-migrate.sh                 # 数据库迁移
│   ├── db-seed.sh                    # 数据库初始化
│   └── clean.sh                      # 清理缓存
│
├── docker-compose.yml                # 开发环境Docker编排（7个容器）
├── docker-compose.prod.yml           # 生产环境Docker编排
├── turbo.json                        # Turborepo管道配置
├── tsconfig.base.json                # 共享TypeScript strict配置
├── pnpm-workspace.yaml               # pnpm workspace配置
└── package.json                      # 根package（脚本+devDeps）
```

---

## 快速开始

### 环境要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | >= 20.0.0（推荐 20 LTS） |
| pnpm | >= 9.0.0 |
| Docker | >= 24.0.0 |
| Docker Compose | >= 2.0.0 |

### 1. 克隆项目

```bash
git clone https://github.com/xiaoshuang1201/xd-smart-cs.git
cd xd-smart-cs
```

### 2. 安装依赖

```bash
# 确保使用 pnpm 9+
corepack enable
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入必要的API Key和密钥
```

关键配置项：

```env
# 数据库
DATABASE_URL=postgresql://xd_user:xd_pass@localhost:5432/xd_smart_cs

# JWT
JWT_SECRET=your-jwt-secret-change-in-production

# DeepSeek API（需要申请）
DEEPSEEK_API_KEY=sk-xxxxx

# Dify
DIFY_API_URL=http://localhost:5001/v1
DIFY_API_KEY=dify-api-key-here
```

### 4. 启动基础设施

```bash
# 启动全部开发容器（PostgreSQL + Redis + MinIO + Milvus + Dify + BGE）
docker compose up -d

# 等待所有容器healthy
docker compose ps
```

Docker 容器列表：

| 容器 | 端口 | 用途 |
|------|------|------|
| xd-postgres | 5432 | PostgreSQL 15 主数据库 |
| xd-redis | 6379 | Redis 7 缓存/限流/队列 |
| xd-minio | 9000/9001 | MinIO 对象存储 |
| xd-milvus | 19530 | Milvus 向量数据库 |
| xd-dify-api | 5001 | Dify 社区版 API |
| xd-dify-worker | — | Dify 异步Worker |
| xd-bge-embedding | 8000 | BGE Embedding 微服务 |

### 5. 初始化数据库

```bash
# 执行数据库迁移
pnpm run db:migrate

# 导入种子数据（默认管理员 + 系统配置）
pnpm run db:seed
```

默认管理员账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123! | super_admin |

### 6. 启动开发服务器

```bash
# 启动全部服务（前端 + 后端）
pnpm run dev

# 或分别启动
pnpm run dev:server   # 后端 → http://localhost:3100
pnpm run dev:web      # 官网 → http://localhost:3000
pnpm run dev:admin    # 后台 → http://localhost:3001
```

### 7. 验证

```bash
# 健康检查
curl http://localhost:3100/api/health

# Swagger文档
open http://localhost:3100/api/docs
```

---

## 核心功能

### 1. 访客咨询全流程

```
访客打开官网 → 生成浏览器指纹 → 创建会话（Redis Session Token）
  → 输入问题 → 限流检查 → RAG缓存检查
    ├── 缓存命中 → 直接返回（<50ms）
    └── 缓存未命中 → Intent识别 → Milvus向量检索 → Dify+DeepSeek生成
       → SSE流式推送 → 打字机逐字渲染 → 持久化 → 缓存写入
```

### 2. 知识库文档处理管道

```
上传文档 → MinIO存储 → knowledge_docs(status=processing)
  → Bull队列异步处理:
    1. 文档解析（PDF/Word/Excel/Markdown → 纯文本）
    2. 语义分块（512 tokens + 10% overlap + 最小100 tokens）
    3. BGE Embedding 批量向量化（max 64条/批）
    4. Milvus 向量写入
    5. knowledge_chunks 元数据写入
    6. knowledge_docs(status=active)
  → WebSocket 实时推送处理进度
  → 自动触发缓存预热
```

### 3. 转人工机制

```
AI置信度计算 = retrieval_score×0.5 + intent_clarity×0.3 + answer_consistency×0.2
  → confidence < 阈值(0.6) → 触发 need_transfer 事件
  → 前端显示转人工确认卡片
  → 用户确认 → AI自动生成对话摘要 → 创建工单
  → 客服接管 → 状态流转: pending → processing → resolved → closed
```

### 4. 多级降级

| 级别 | 触发条件 | 降级行为 |
|------|----------|----------|
| L1 | Redis不可用 | 限流降级为PostgreSQL |
| L2 | Dify不可用 | 返回预设回复 + 提示转人工 |
| L3 | DeepSeek不可用 | 仅返回RAG检索片段不生成 |
| L4 | Milvus不可用 | 关键词匹配 + 提示转人工 |

### 5. 角色权限矩阵

| 权限 | super_admin | customer_service | knowledge_admin |
|------|:-----------:|:----------------:|:---------------:|
| 数据看板 | ✅ | ❌ | ❌ |
| 对话记录查看 | ✅ | ✅ | ❌ |
| 工单管理 | ✅ | ✅ | ❌ |
| 知识库管理 | ✅ | ❌ | ✅ |
| Agent配置 | ✅ | ❌ | ❌ |
| 系统设置 | ✅ | ❌ | ❌ |
| 管理员管理 | ✅ | ❌ | ❌ |

---

## 数据库设计

系统使用 PostgreSQL 15，通过 Prisma ORM 管理。共 **10张核心表**：

| # | 表名 | 说明 | 核心字段 |
|---|------|------|---------|
| 1 | `visitors` | 访客信息 | fingerprint(unique), ip_address, user_agent, visit_count |
| 2 | `conversations` | 对话会话 | session_token(unique), status, source_context, agent_confidence |
| 3 | `messages` | 消息记录 | role, content, intent, confidence_score, retrieval_sources, feedback |
| 4 | `admin_users` | 管理员 | username(unique), password_hash, role(enum: 3种角色) |
| 5 | `refresh_tokens` | 刷新令牌 | token(unique), expires_at, revoked |
| 6 | `knowledge_docs` | 知识文档 | file_type, file_path, version, status, chunk_count |
| 7 | `knowledge_chunks` | 文档分块 | chunk_index, content, vector_id(Milvus关联) |
| 8 | `work_orders` | 工单 | status(enum: 4种状态), priority(enum: 4级), ai_summary |
| 9 | `rate_limits` | 限流记录 | visitor_id, endpoint, count, window_start |
| 10 | `system_configs` | 系统配置 | config_key(unique), config_value(JSONB), description |

**关键设计决策**：

- **消息表按月分区**：`messages` 表按 `created_at` RANGE 分区，每月自动创建新分区（`messages_2026_06`, `messages_2026_07`, ...）
- **冷热数据分离**：3个月内热数据 → 3-12个月温数据 → 超过12个月归档至 `archive` Schema
- **UUID主键**：所有表统一使用 UUID，避免自增ID暴露业务量
- **软删除**：重要业务表（knowledge_docs）使用 `deleted_at` 实现软删除
- **Milvus外挂向量**：向量数据单独存储在 Milvus，PostgreSQL 仅保留 `vector_id` 关联字段

---

## API接口概览

遵循 RESTful 设计规范，统一前缀 `/api/v1/`，统一响应格式：

```json
{
  "code": 0,
  "message": "success",
  "data": { },
  "meta": {
    "timestamp": "2026-05-16T08:30:00.000Z",
    "requestId": "req_uuid_xxxx",
    "pagination": { "page": 1, "pageSize": 20, "total": 156, "totalPages": 8 }
  }
}
```

### 访客端 API（共10个端点）

| 方法 | 端点 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/v1/auth/session` | 创建访客会话 | — |
| GET | `/api/v1/auth/session` | 验证会话有效性 | Session Token |
| POST | `/api/v1/conversations/:id/messages` | 发送消息 | Session + CSRF |
| GET | `/api/v1/conversations/:id/messages` | 获取对话历史 | Session Token |
| GET | `/api/v1/conversations/:id/stream` | SSE流式接收回复 | Session Token |
| POST | `/api/v1/messages/:id/feedback` | 消息反馈（👍/👎） | Session + CSRF |
| POST | `/api/v1/conversations/:id/transfer` | 请求转人工 | Session + CSRF |
| GET | `/api/v1/conversations` | 历史会话列表 | Session Token |
| POST | `/api/v1/conversations/:id/close` | 关闭会话 | Session + CSRF |

### 管理后台 API（共40+个端点，按模块分类）

| 模块 | 端点前缀 | 端点数量 | 说明 |
|------|----------|:------:|------|
| 认证 | `/api/v1/admin/auth/` | 4 | 登录 / 刷新Token / 登出 / 当前用户 |
| 数据看板 | `/api/v1/admin/dashboard/` | 3 | 核心指标 / 热问排行 / 未命中清单 |
| 对话管理 | `/api/v1/admin/conversations/` | 3 | 列表 / 详情 / 统计 |
| 知识库 | `/api/v1/admin/knowledge/` | 8 | CRUD + 上传 + 预览测试 + 重新处理 + 版本历史 |
| 工单 | `/api/v1/admin/workorders/` | 3 | 列表 / 详情 / 更新 + 统计 |
| Agent配置 | `/api/v1/admin/agent/` | 2 | 获取配置 / 更新配置 |
| 系统管理 | `/api/v1/admin/users/`, `/api/v1/admin/settings/` | 5+ | 管理员CRUD + 系统配置 |

### 鉴权方案

| 端 | 鉴权方式 | Token有效期 |
|----|----------|------------|
| 访客端 | `X-Session-Token` Header + `X-CSRF-Token` | 24小时（自动续期） |
| 管理后台 | `Authorization: Bearer {JWT}` + Refresh Token轮换 | Access: 2h, Refresh: 7d |

### 错误码体系

| 范围 | 类别 | 示例 |
|------|------|------|
| 0 | 成功 | — |
| 40001-40099 | 参数错误 | 40001 参数校验失败 |
| 40101-40199 | 鉴权错误 | 40102 Token已过期 |
| 40301-40399 | 禁止访问 | 40301 权限不足 |
| 40401-40499 | 资源不存在 | 40403 知识文档不存在 |
| 40901-40999 | 冲突 | 40901 会话已关闭 |
| 42901-42999 | 限流 | 42901 请求过于频繁 |
| 50001-50099 | 服务端错误 | 50002 数据库操作失败 |
| 50201-50299 | AI服务错误 | 50201 Dify服务调用失败 |
| 50301-50399 | 服务降级 | 50301 知识库处理中不可用 |

Swagger 文档完整可用：启动后端后访问 `http://localhost:3100/api/docs`

---

## Redis缓存设计

采用 **L0(浏览器缓存) → L1(应用内存) → L2(Redis分布式缓存)** 三级缓存架构。

### Key命名规范

```
{业务域}:{子域}:{标识符}

示例:
  session:token:{sessionToken}           # 会话Token → Hash
  rag:answer:{questionHash}              # RAG问答缓存 → Hash
  rag:doc_cache:{documentId}             # 文档→缓存映射 → Set
  rate:message:{sessionToken}            # 消息限流 → Sorted Set
  conv:context:{conversationId}          # 对话上下文 → RedisJSON
  stats:hot:daily:{date}                 # 热问排行 → Sorted Set
  lock:document:{documentId}             # 分布式锁 → String
```

### 核心缓存策略

| 缓存对象 | 数据类型 | TTL | 说明 |
|----------|----------|-----|------|
| Session Token | Hash | 24h（续期） | 会话凭证+访客信息 |
| RAG问答缓存 | Hash | 24h（命中续期至72h） | 问题→答案，命中率目标≥60% |
| 对话上下文 | RedisJSON | 30min（续期） | 摘要+滑动窗口+槽位 |
| 限流计数器 | Sorted Set | 窗口+1s | 滑动窗口限流 |
| 看板实时数据 | Hash | 7天 | 增量HINCRBY更新 |
| 热问排行 | Sorted Set | 7天 | ZINCRBY即时更新 |
| 分布式锁 | String (NX) | 30s | SET NX EX原子操作 |

### 缓存失效策略

- **RAG缓存**：文档更新时通过 `rag:doc_cache:{docId}` Set 精确批量删除关联的问答缓存
- **淘汰策略**：`volatile-lru` — 仅驱逐设置了过期时间的Key
- **内存上限**：2GB，超过后按LRU淘汰
- **持久化**：RDB（每15分钟快照）+ AOF（每秒fsync）混合持久化

---

## 部署指南

### 生产环境架构

```
                    ┌──────────┐
                    │  CloudFlare│  (DNS + CDN + SSL)
                    └────┬─────┘
                         │
                  ┌──────┴──────┐
                  │   Nginx     │  (反向代理 + HTTPS + HTTP/2 + Gzip)
                  └──────┬──────┘
           ┌─────────────┼─────────────┐
           │             │             │
    ┌──────┴──────┐ ┌───┴────┐ ┌─────┴─────┐
    │ Nest.js API │ │ Nuxt 3 │ │ Vue 3     │
    │ (3100)      │ │ (3000) │ │ Admin     │
    └──────┬──────┘ └────────┘ └───────────┘
           │
    ┌──────┼──────┬──────┬──────┬──────┐
    │      │      │      │      │      │
  PG 15  Redis  MinIO Milvus Dify  BGE
```

### 部署步骤

```bash
# 1. 配置生产环境变量
cp .env.example .env.production
# 编辑 .env.production

# 2. 构建Docker镜像
docker compose -f docker-compose.prod.yml build

# 3. 启动生产服务
docker compose -f docker-compose.prod.yml up -d

# 4. 执行数据库迁移
pnpm run db:migrate

# 5. 验证健康状态
curl https://your-domain.com/api/health
```

### 灰度发布流程

```
Step 1: develop → CI通过
Step 2: release/v1.0.0 分支 → 部署Staging
Step 3: Staging冒烟测试（14个E2E场景）
Step 4: 审批 → 合并main → 打tag
Step 5: 构建Docker镜像 → 推送Registry
Step 6: 灰度10%流量（30分钟观察）
Step 7: 灰度50%（15分钟观察）
Step 8: 100%全量
```

### 监控告警

| 告警项 | 条件 | 级别 | 通知方式 |
|--------|------|------|----------|
| API响应过高 | P95 > 3s 持续5min | Warning | 企微/钉钉 |
| API错误率过高 | 5xx > 5% 持续1min | Critical | 企微+电话 |
| Dify不可用 | 连续3次健康检查失败 | Critical | 企微+电话 |
| Redis内存 > 80% | used_memory > 80% | Warning | 企微 |
| 磁盘 > 85% | disk usage > 85% | Warning | 企微 |
| 容器异常退出 | status=exited | Critical | 企微+电话 |

### 回滚方案

| 回滚对象 | 方法 | RTO | RPO |
|----------|------|:---:|:---:|
| Docker镜像 | 切回上一版本tag | <5min | 0 |
| 数据库Migration | 执行反向Migration SQL | <10min | 0 |
| 知识库向量 | 从Milvus备份恢复 | <30min | 上次备份 |
| 完整系统 | 一键rollback脚本 | <15min | 0 |

---

## 开发规范

### Git分支模型

```
main           # 生产分支
  ├── develop  # 开发主分支
  │   ├── feature/phase0-infra-setup
  │   ├── feature/phase1-data-layer
  │   ├── feature/phase2-infra-services
  │   ├── feature/phase3-shared-common
  │   ├── feature/phase4-core-auth-gateway-conv-agent
  │   ├── feature/phase5-knowledge-workorder-analytics-system
  │   ├── feature/phase6-web-chat-frontend
  │   ├── feature/phase7-admin-frontend
  │   └── feature/phase8-integration-test-optimize
  ├── release/v1.0.0
  └── hotfix/*
```

### Commit规范（Conventional Commits）

```
feat: 新功能        fix: 修复Bug        docs: 文档
style: 格式         refactor: 重构      perf: 性能优化
test: 测试          chore: 构建/工具    ci: CI/CD
revert: 回滚

示例: feat(auth): add JWT token refresh mechanism
```

### 中间件执行顺序

```
1. requestIdMiddleware      → 注入 X-Request-ID
2. requestLogMiddleware     → 请求日志
3. helmetMiddleware         → 安全Header
4. corsMiddleware           → CORS跨域
5. rateLimitMiddleware      → Redis滑动窗口限流
6. sessionParseMiddleware   → 解析鉴权Token
7. sensitiveWordMiddleware  → 敏感词过滤
8. bodyParserMiddleware     → Body解析（限1MB）
```

### 代码质量

| 工具 | 用途 |
|------|------|
| ESLint + Prettier | 代码规范 + 格式化 |
| TypeScript strict | 类型检查 |
| Husky + lint-staged | Git提交前自动检查 |
| Turborepo | 构建缓存 + 并行任务 |

---

## 测试策略

| 层级 | 框架 | 目标 |
|------|------|:---:|
| 后端单元测试 | Jest | 覆盖率 ≥ 80% |
| 后端Controller E2E | Jest + supertest | 覆盖率 ≥ 90% |
| 前端组件测试 | Vitest + @vue/test-utils | 覆盖率 ≥ 70% |
| 前端Composable测试 | Vitest | 覆盖率 ≥ 80% |
| 全栈E2E | Playwright | 14个核心场景 |
| 压力测试 | k6 | 10项性能指标达标 |
| 安全扫描 | npm audit + OWASP ZAP | 0 high/critical |

### E2E测试场景（14个）

| 编号 | 场景 | 验证点 |
|:---:|------|--------|
| E2E-01 | 官网→气泡→发消息→SSE响应 | 流式生成完成 |
| E2E-02 | 20轮长对话→上下文截断 | 滑动窗口正确截断 |
| E2E-03 | 网络断线→SSE自动重连 | 3次重试后提示 |
| E2E-04 | 特殊字符/emoji/超长消息 | 不崩溃 |
| E2E-05 | 知识检索→引用来源 | 来源链接可点击 |
| E2E-06 | 转人工→工单创建 | 用户收到确认 |
| E2E-07 | 管理员全部功能 | 12个页面正常 |
| E2E-08 | 知识上传→检索验证 | 上传→索引→可检索 |
| E2E-09 | Agent配置→对话测试 | 新Prompt生效 |
| E2E-10 | viewer权限限制 | 无法修改/删除 |
| E2E-11 | 100并发同时对话 | 无超时/丢失 |
| E2E-12 | 10万chunks检索 | 延迟 < 500ms |
| E2E-13 | Token过期→自动刷新 | 用户无感知 |
| E2E-14 | 数据库连接池耗尽→恢复 | 自动恢复 |

---

## 性能指标

| 指标 | 目标值 | 测试方法 |
|------|:------:|---------|
| 首包延迟 (TTFB) | < 3s | k6 100并发 |
| API P95延迟 | < 500ms | k6 5分钟负载 |
| SSE消息推送延迟 | < 200ms/token | 计时统计 |
| 知识检索P95 | < 500ms | k6 50并发 |
| RAG缓存命中率 | ≥ 60% | 生产监控 |
| SSE并发连接数 | ≥ 500 | k6 SSE测试 |
| 前端Lighthouse | ≥ 80 | Lighthouse CLI |
| Agent自助解决率 | ≥ 70% | 生产统计 |
| 知识检索命中率 | ≥ 85% | 离线评估 |
| 系统可用性 | 99.5% | — |

---

## 里程碑

| 时间 | 阶段 | 里程碑 | 交付物 |
|------|------|--------|--------|
| Week 1-2 | Phase 0-1 | 环境可运行 | 基础设施+数据库 |
| Week 3-4 | Phase 2-3 | API可调用 | 8个基础设施Service+共享包 |
| Week 5-6 | Phase 4 | 核心链路打通 | Auth+Gateway+Agent+Conversation |
| Week 7-8 | Phase 5-6 | 知识库+官网可用 | Knowledge+WorkOrder+官网聊天 |
| Week 9-10 | Phase 7 | 管理后台完成 | 12个管理页面 |
| Week 11 | Phase 8 | 性能达标 | 集成测试+性能优化 |
| Week 12 | Phase 9 | 正式上线 | 灰度发布+监控就绪 |

**目标上线**: 2026年Q3

---

## 团队

| 角色 | 职责 |
|------|------|
| 前端全栈 | Nuxt 3官网 + Vue 3管理后台 + 前端工程化 |
| 后端全栈 | Nest.js后端 + Dify集成 + RAG管道 + 基础设施 |

---

## 许可证

本项目采用 MIT 许可证。

---

## 相关文档

- [数据库设计文档](./docs/database-design.md)
- [API接口设计文档](./docs/api-design.md)
- [Redis缓存设计文档](./docs/redis-design.md)
- [前端页面设计文档](./docs/frontend-design.md)
- [后端架构设计文档](./docs/backend-architecture.md)
- [业务流程设计文档](./docs/business-process.md)
- [工程实施总计划](./docs/implementation-plan.md)

---

<p align="center">
  <sub>Powered by 新鼎电炉科技 · Built with ❤️ by 小鱼</sub>
</p>
