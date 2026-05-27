# 新鼎电炉科技——智能客服系统 数据库设计

## 一、设计概述

### 1.1 技术选型

| 项目    | 选择                                   |
| ----- | ------------------------------------ |
| 数据库   | PostgreSQL 15.x                      |
| ORM   | Prisma (TypeScript原生，Schema-first)   |
| 向量数据库 | Milvus Lite 2.4.x（向量存储不在PostgreSQL中） |
| 缓存    | Redis 7.x（详见Redis缓存设计文档）             |
| 文件存储  | MinIO（文档原始文件，不在数据库中）                 |

### 1.2 设计原则

1. **核心业务数据**：存储在PostgreSQL，保证ACID
2. **向量数据**：存储在Milvus，仅保留PostgreSQL中的文档元数据
3. **文件本身**：存储在MinIO，PostgreSQL只存文件路径/元信息
4. **热数据**：Redis缓存，减少DB查询压力
5. **消息表分区**：从Day 1按月份分区，支撑海量对话数据

### 1.3 命名规范

- 表名：snake_case，复数形式（如 `conversations`, `messages`）
- 字段名：snake_case，有意义的完整单词
- 主键：统一使用UUID（`id`），避免自增ID暴露业务量
- 时间戳：每表必有 `created_at`, `updated_at`
- 软删除：重要业务表使用 `deleted_at` 软删除
- 索引名：`idx_表名_字段名` 格式

## 二、ER图（实体关系描述）

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   admin_users    │       │    visitors      │       │   conversations  │
│   (管理员/客服)   │       │    (访客)        │       │   (对话会话)      │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ username         │       │ fingerprint      │       │ visitor_id (FK)  │
│ password_hash    │       │ ip_address       │       │ session_token    │
│ display_name     │       │ user_agent       │       │ status           │
│ role             │       │ first_seen_at    │       │ source_page      │
│ status           │       │ last_seen_at     │       │ agent_confidence │
│ ...              │       │ ...              │       │ ...              │
└──────┬───────────┘       └───────┬──────────┘       └────────┬─────────┘
       │                           │                           │
       │ 1:N                       │ 1:N                       │ 1:N
       ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   work_orders    │       │                  │       │    messages      │
│   (工单)         │       │                  │       │    (消息)        │
├──────────────────┤       │                  │       ├──────────────────┤
│ id (PK)          │       │                  │       │ id (PK)          │
│ conversation_id  │       │                  │       │ conversation_id  │
│ assignee_id (FK) │       │                  │       │ role             │
│ status           │       │                  │       │ content          │
│ priority         │       │                  │       │ intent           │
│ ...              │       │                  │       │ confidence_score │
└──────────────────┘       │                  │       │ metadata         │
                            │                  │       │ tokens_used      │
┌──────────────────┐       │                  │       │ feedback         │
│ knowledge_docs   │       │                  │       │ ...              │
│ (知识文档)       │       │                  │       └──────────────────┘
├──────────────────┤       │
│ id (PK)          │       │  ┌──────────────────┐
│ uploaded_by (FK) │       │  │  knowledge_chunks│
│ title            │       │  │  (文档分块)      │
│ file_type        │       │  ├──────────────────┤
│ file_path        │       │  │ id (PK)          │
│ file_size        │       │  │ document_id (FK) │
│ version          │       │  │ chunk_index      │
│ status           │       │  │ content          │
│ ...              │       │  │ token_count      │
└──────────────────┘       │  │ vector_id        │◄── Milvus向量ID关联
                            │  │ ...              │
┌──────────────────┐       │  └──────────────────┘
│ system_configs   │       │
│ (系统配置)       │       │  ┌──────────────────┐
├──────────────────┤       │  │  rate_limits     │
│ id (PK)          │       │  │ (限流记录)       │
│ config_key       │       │  ├──────────────────┤
│ config_value     │       │  │ id (PK)          │
│ description      │       │  │ key              │
│ ...              │       │  │ points           │
└──────────────────┘       │  │ expires_at       │
                            │  └──────────────────┘
┌──────────────────┐       │
│ feedback_logs    │       │
│ (反馈详细记录)   │       │
├──────────────────┤       │
│ id (PK)          │       │
│ message_id (FK)  │       │
│ rating           │       │
│ reason           │       │
│ ...              │       │
└──────────────────┘       │
```

**关键关系说明**：
- `visitors` 1:N `conversations` — 一个访客可以有多个会话（不同时段访问）
- `conversations` 1:N `messages` — 一个会话包含多条消息
- `conversations` 1:0..1 `work_orders` — 一个会话最多转一个工单
- `admin_users` 1:N `work_orders` — 一个客服可以处理多个工单
- `admin_users` 1:N `knowledge_docs` — 一个管理员上传多份文档
- `knowledge_docs` 1:N `knowledge_chunks` — 一份文档拆分多个分块
- `messages` 1:0..1 `feedback_logs` — 一条AI消息最多一条反馈

## 三、表结构详细设计

### 3.1 访客表 (visitors)

存储访问官网的匿名访客信息，通过浏览器指纹+IP标识。

```sql
CREATE TABLE visitors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint     VARCHAR(64) NOT NULL,       -- 浏览器指纹hash（前端生成）
    ip_address      INET,                        -- 客户端IP地址
    user_agent      TEXT,                        -- 浏览器UA
    referrer        TEXT,                        -- 来源URL
    first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visit_count     INTEGER NOT NULL DEFAULT 1,
    metadata        JSONB DEFAULT '{}',          -- 扩展元数据（地区、语言等）
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE UNIQUE INDEX idx_visitors_fingerprint ON visitors(fingerprint);
CREATE INDEX idx_visitors_last_seen ON visitors(last_seen_at DESC);
CREATE INDEX idx_visitors_ip ON visitors(ip_address);
```

**Prisma Schema**:
```prisma
model Visitor {
  id            String          @id @default(uuid()) @db.Uuid
  fingerprint   String          @unique @db.VarChar(64)
  ipAddress     String?         @map("ip_address") @db.Inet
  userAgent     String?         @map("user_agent") @db.Text
  referrer      String?         @db.Text
  firstSeenAt   DateTime        @default(now()) @map("first_seen_at") @db.Timestamptz()
  lastSeenAt    DateTime        @default(now()) @updatedAt @map("last_seen_at") @db.Timestamptz()
  visitCount    Int             @default(1) @map("visit_count")
  metadata      Json            @default("{}") @map("metadata") @db.Jsonb
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt     DateTime        @updatedAt @map("updated_at") @db.Timestamptz()
  conversations Conversation[]

  @@map("visitors")
}
```

---

### 3.2 对话会话表 (conversations)

记录每次客服对话会话。

```sql
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id      UUID NOT NULL REFERENCES visitors(id),
    session_token   VARCHAR(128) NOT NULL UNIQUE, -- 前端持有的会话token
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active/closed/transferred
    source_page     VARCHAR(500),               -- 发起对话时所在页面URL
    source_context  JSONB DEFAULT '{}',         -- 页面上下文（产品ID、分类等）
    message_count   INTEGER NOT NULL DEFAULT 0, -- 消息计数（冗余，方便排序/过滤）
    agent_confidence FLOAT,                     -- Agent最后一次回答的置信度
    transferred_at  TIMESTAMPTZ,                -- 转人工时间
    transferred_reason VARCHAR(500),            -- 转人工原因
    resolved_by     UUID REFERENCES admin_users(id), -- 解决该会话的客服ID
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ                 -- 会话关闭时间
);

CREATE INDEX idx_conversations_visitor ON conversations(visitor_id);
CREATE INDEX idx_conversations_session_token ON conversations(session_token);
CREATE INDEX idx_conversations_status ON conversations(status) WHERE status = 'active';
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);
```

```prisma
model Conversation {
  id                 String        @id @default(uuid()) @db.Uuid
  visitorId          String        @map("visitor_id") @db.Uuid
  sessionToken       String        @unique @map("session_token") @db.VarChar(128)
  status             String        @default("active") @db.VarChar(20) // active | closed | transferred
  sourcePage         String?       @map("source_page") @db.VarChar(500)
  sourceContext      Json          @default("{}") @map("source_context") @db.Jsonb
  messageCount       Int           @default(0) @map("message_count")
  agentConfidence    Float?        @map("agent_confidence")
  transferredAt      DateTime?     @map("transferred_at") @db.Timestamptz()
  transferredReason  String?       @map("transferred_reason") @db.VarChar(500)
  resolvedById       String?       @map("resolved_by") @db.Uuid
  resolvedAt         DateTime?     @map("resolved_at") @db.Timestamptz()
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz()
  closedAt           DateTime?     @map("closed_at") @db.Timestamptz()

  visitor     Visitor       @relation(fields: [visitorId], references: [id])
  messages    Message[]
  workOrder   WorkOrder?
  resolvedBy  AdminUser?    @relation(fields: [resolvedById], references: [id])

  @@map("conversations")
}
```

---

### 3.3 消息表 (messages) ⚠️ 按月分区

存储所有对话消息（用户消息 + AI回复）。

```sql
-- 主表（分区父表）
CREATE TABLE messages (
    id                  UUID NOT NULL,
    conversation_id     UUID NOT NULL,
    role                VARCHAR(10) NOT NULL,       -- user / assistant / system
    content             TEXT NOT NULL,               -- 消息正文
    intent              VARCHAR(30),                 -- 意图分类：product_inquiry/price/after_sales/transfer/chat
    confidence_score    FLOAT,                       -- Agent置信度
    metadata            JSONB DEFAULT '{}',          -- 扩展元数据
    tokens_used         INTEGER,                     -- 该轮消耗Token数
    retrieval_sources   JSONB DEFAULT '[]',          -- RAG检索来源：[{doc_id, chunk_id, score}]
    feedback            VARCHAR(10),                 -- helpful / unhelpful (仅在role=assistant时)
    feedback_detail     TEXT,                        -- 用户反馈附加说明
    feedback_at         TIMESTAMPTZ,                 -- 反馈时间
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)                     -- 分区键必须包含在主键中
) PARTITION BY RANGE (created_at);

-- 分区创建（示例：2026年Q3-Q4）
CREATE TABLE messages_2026_07 PARTITION OF messages
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE messages_2026_08 PARTITION OF messages
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE messages_2026_09 PARTITION OF messages
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE messages_2026_10 PARTITION OF messages
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE messages_2026_11 PARTITION OF messages
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE messages_2026_12 PARTITION OF messages
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 默认分区（捕获未预创建的数据，运维告警）
CREATE TABLE messages_default PARTITION OF messages DEFAULT;

-- 分区索引
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_intent ON messages(intent, created_at DESC);
CREATE INDEX idx_messages_feedback ON messages(feedback) WHERE feedback IS NOT NULL;
```

```prisma
// ⚠️ Prisma对分区表支持有限，需在migration中手写SQL
model Message {
  id               String    @id @default(uuid()) @db.Uuid
  conversationId   String    @map("conversation_id") @db.Uuid
  role             String    @db.VarChar(10) // user | assistant | system
  content          String    @db.Text
  intent           String?   @db.VarChar(30)
  confidenceScore  Float?    @map("confidence_score")
  metadata         Json      @default("{}") @db.Jsonb
  tokensUsed       Int?      @map("tokens_used")
  retrievalSources Json      @default("[]") @map("retrieval_sources") @db.Jsonb
  feedback         String?   @db.VarChar(10) // helpful | unhelpful
  feedbackDetail   String?   @map("feedback_detail") @db.Text
  feedbackAt       DateTime? @map("feedback_at") @db.Timestamptz()
  createdAt        DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  conversation Conversation @relation(fields: [conversationId], references: [id])

  @@map("messages")
}
```

**分区管理存储过程**（自动化脚本）:
```sql
-- 每月自动创建下月分区（cron任务）
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    next_month_start DATE;
    next_month_end DATE;
    table_name TEXT;
BEGIN
    next_month_start := date_trunc('month', NOW()) + INTERVAL '1 month';
    next_month_end := next_month_start + INTERVAL '1 month';
    table_name := 'messages_' || to_char(next_month_start, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF messages
         FOR VALUES FROM (%L) TO (%L)',
        table_name, next_month_start, next_month_end
    );
END;
$$ LANGUAGE plpgsql;
```

---

### 3.4 管理员用户表 (admin_users)

```sql
CREATE TYPE admin_role AS ENUM ('super_admin', 'customer_service', 'knowledge_admin');

CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100) NOT NULL,
    email           VARCHAR(200),
    phone           VARCHAR(20),
    role            admin_role NOT NULL DEFAULT 'customer_service',
    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active/disabled
    last_login_at   TIMESTAMPTZ,
    last_login_ip   INET,
    login_count     INTEGER NOT NULL DEFAULT 0,
    avatar_url      VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admin_username ON admin_users(username);
CREATE INDEX idx_admin_role ON admin_users(role);
```

```prisma
enum AdminRole {
  super_admin
  customer_service
  knowledge_admin
}

model AdminUser {
  id           String      @id @default(uuid()) @db.Uuid
  username     String      @unique @db.VarChar(50)
  passwordHash String      @map("password_hash") @db.VarChar(255)
  displayName  String      @map("display_name") @db.VarChar(100)
  email        String?     @db.VarChar(200)
  phone        String?     @db.VarChar(20)
  role         AdminRole   @default(customer_service)
  status       String      @default("active") @db.VarChar(20)
  lastLoginAt  DateTime?   @map("last_login_at") @db.Timestamptz()
  lastLoginIp  String?     @map("last_login_ip") @db.Inet
  loginCount   Int         @default(0) @map("login_count")
  avatarUrl    String?     @map("avatar_url") @db.VarChar(500)
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime    @updatedAt @map("updated_at") @db.Timestamptz()

  workOrders     WorkOrder[]
  knowledgeDocs  KnowledgeDoc[]
  resolvedCons   Conversation[]  @relation("ResolvedBy")

  @@map("admin_users")
}
```

**角色权限矩阵**:

| 权限项 | super_admin | customer_service | knowledge_admin |
|--------|:-----------:|:----------------:|:---------------:|
| 数据看板查看 | ✅ | ❌ | ❌ |
| 对话记录查看 | ✅ | ✅ | ❌ |
| 对话记录删除 | ✅ | ❌ | ❌ |
| 工单管理 | ✅ | ✅ | ❌ |
| 知识库上传/编辑 | ✅ | ❌ | ✅ |
| 知识库版本管理 | ✅ | ❌ | ✅ |
| Agent配置修改 | ✅ | ❌ | ❌ |
| 系统设置修改 | ✅ | ❌ | ❌ |
| 管理员账户管理 | ✅ | ❌ | ❌ |

---

### 3.5 知识文档表 (knowledge_docs)

```sql
CREATE TABLE knowledge_docs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    file_type       VARCHAR(20) NOT NULL,          -- pdf / docx / xlsx / pptx / txt / md
    file_path       VARCHAR(1000) NOT NULL,        -- MinIO对象路径 (bucket/key)
    file_size       BIGINT,                        -- 文件大小(bytes)
    file_hash       VARCHAR(64),                   -- SHA256，用于去重
    version         VARCHAR(50) NOT NULL DEFAULT '1.0',
    version_label   VARCHAR(200),                  -- 版本说明
    chunk_count     INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER,                       -- 文档总Token数
    status          VARCHAR(20) NOT NULL DEFAULT 'processing', -- processing/active/error/archived
    error_message   TEXT,                          -- 处理失败原因
    is_active       BOOLEAN NOT NULL DEFAULT false, -- 是否启用（A/B测试用）
    uploaded_by     UUID NOT NULL REFERENCES admin_users(id),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                    -- 软删除
);

CREATE INDEX idx_kdocs_status ON knowledge_docs(status);
CREATE INDEX idx_kdocs_uploaded_by ON knowledge_docs(uploaded_by);
CREATE INDEX idx_kdocs_file_type ON knowledge_docs(file_type);
CREATE INDEX idx_kdocs_version ON knowledge_docs(title, version);
CREATE INDEX idx_kdocs_active ON knowledge_docs(is_active) WHERE is_active = true;
```

```prisma
model KnowledgeDoc {
  id            String    @id @default(uuid()) @db.Uuid
  title         String    @db.VarChar(500)
  description   String?   @db.Text
  fileType      String    @map("file_type") @db.VarChar(20)
  filePath      String    @map("file_path") @db.VarChar(1000)
  fileSize      BigInt?   @map("file_size")
  fileHash      String?   @map("file_hash") @db.VarChar(64)
  version       String    @default("1.0") @db.VarChar(50)
  versionLabel  String?   @map("version_label") @db.VarChar(200)
  chunkCount    Int       @default(0) @map("chunk_count")
  totalTokens   Int?      @map("total_tokens")
  status        String    @default("processing") @db.VarChar(20)
  errorMessage  String?   @map("error_message") @db.Text
  isActive      Boolean   @default(false) @map("is_active")
  uploadedById  String    @map("uploaded_by") @db.Uuid
  processedAt   DateTime? @map("processed_at") @db.Timestamptz()
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz()

  uploadedBy AdminUser       @relation(fields: [uploadedById], references: [id])
  chunks     KnowledgeChunk[]

  @@map("knowledge_docs")
}
```

---

### 3.6 知识文档分块表 (knowledge_chunks)

```sql
CREATE TABLE knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,             -- 文档内块序号（从0开始）
    content         TEXT NOT NULL,                 -- 分块文本内容
    token_count     INTEGER,                      -- 分块Token数
    vector_id       VARCHAR(100),                  -- Milvus中的向量ID（关联字段，不设外键）
    metadata        JSONB DEFAULT '{}',           -- 分块元数据（页码、章节标题等）
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_kchunks_document ON knowledge_chunks(document_id);
CREATE INDEX idx_kchunks_vector ON knowledge_chunks(vector_id);
```

```prisma
model KnowledgeChunk {
  id          String   @id @default(uuid()) @db.Uuid
  documentId  String   @map("document_id") @db.Uuid
  chunkIndex  Int      @map("chunk_index")
  content     String   @db.Text
  tokenCount  Int?     @map("token_count")
  vectorId    String?  @map("vector_id") @db.VarChar(100)
  metadata    Json     @default("{}") @db.Jsonb
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()

  document KnowledgeDoc @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, chunkIndex])
  @@map("knowledge_chunks")
}
```

---

### 3.7 工单表 (work_orders)

```sql
CREATE TYPE workorder_status AS ENUM ('pending', 'processing', 'resolved', 'closed');
CREATE TYPE workorder_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE work_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL UNIQUE REFERENCES conversations(id),
    title               VARCHAR(300) NOT NULL,
    description         TEXT NOT NULL,
    customer_contact    VARCHAR(200),              -- 客户联系方式（手机/邮箱/微信）
    status              workorder_status NOT NULL DEFAULT 'pending',
    priority            workorder_priority NOT NULL DEFAULT 'medium',
    assignee_id         UUID REFERENCES admin_users(id),
    ai_summary          TEXT,                      -- AI自动生成的对话摘要
    resolution_notes    TEXT,                      -- 客服解决备注
    assigned_at         TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workorders_status ON work_orders(status);
CREATE INDEX idx_workorders_assignee ON work_orders(assignee_id);
CREATE INDEX idx_workorders_priority ON work_orders(priority);
CREATE INDEX idx_workorders_created ON work_orders(created_at DESC);
```

```prisma
enum WorkOrderStatus {
  pending
  processing
  resolved
  closed
}

enum WorkOrderPriority {
  low
  medium
  high
  urgent
}

model WorkOrder {
  id               String            @id @default(uuid()) @db.Uuid
  conversationId   String            @unique @map("conversation_id") @db.Uuid
  title            String            @db.VarChar(300)
  description      String            @db.Text
  customerContact  String?           @map("customer_contact") @db.VarChar(200)
  status           WorkOrderStatus   @default(pending)
  priority         WorkOrderPriority @default(medium)
  assigneeId       String?           @map("assignee_id") @db.Uuid
  aiSummary        String?           @map("ai_summary") @db.Text
  resolutionNotes  String?           @map("resolution_notes") @db.Text
  assignedAt       DateTime?         @map("assigned_at") @db.Timestamptz()
  resolvedAt       DateTime?         @map("resolved_at") @db.Timestamptz()
  createdAt        DateTime          @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt        DateTime          @updatedAt @map("updated_at") @db.Timestamptz()

  conversation Conversation @relation(fields: [conversationId], references: [id])
  assignee     AdminUser?   @relation(fields: [assigneeId], references: [id])

  @@map("work_orders")
}
```

---

### 3.8 限流记录表 (rate_limits)

```sql
CREATE TABLE rate_limits (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key    VARCHAR(255) NOT NULL,            -- 限流key（IP / Session Token）
    points      INTEGER NOT NULL DEFAULT 0,       -- 已消耗配额
    max_points  INTEGER NOT NULL,                 -- 配额上限
    window_ms   INTEGER NOT NULL,                 -- 时间窗口(ms)
    expires_at  TIMESTAMPTZ NOT NULL,             -- 过期时间
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ratelimit_key ON rate_limits(rate_key);
CREATE INDEX idx_ratelimit_expires ON rate_limits(expires_at);
```

> **说明**：限流主逻辑在Redis中实现（详见Redis缓存设计文档），此表用于持久化存储和跨日统计分析。当Redis不可用时作为降级方案。

---

### 3.9 系统配置表 (system_configs)

```sql
CREATE TABLE system_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key      VARCHAR(100) NOT NULL UNIQUE,
    config_value    JSONB NOT NULL,               -- 任意类型的配置值存为JSON
    description     VARCHAR(500),
    updated_by      UUID REFERENCES admin_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_sysconfig_key ON system_configs(config_key);
```

**预设配置项**:

| config_key | 说明 | 默认值 |
|------------|------|--------|
| `agent.rate_limit.ttl` | 全局API限流窗口(秒) | 60 |
| `agent.rate_limit.max` | 全局API限流上限 | 30 |
| `agent.confidence_threshold` | 转人工置信度阈值 | 0.6 |
| `agent.max_tokens_per_conversation` | 单次对话Token上限 | 4096 |
| `agent.sliding_window_size` | 滑动窗口轮数 | 10 |
| `agent.greeting_message` | 欢迎语模板 | "您好！我是新鼎电炉智能客服..." |
| `rag.top_k` | RAG检索返回片段数 | 5 |
| `rag.similarity_threshold` | 语义相似度最低阈值 | 0.7 |
| `rag.hybrid_search_weight` | 混合检索中语义vs关键词权重 | 0.7 |
| `chat.idle_timeout_minutes` | 会话空闲超时(分) | 30 |

---

## 四、索引策略汇总

| 表 | 索引 | 类型 | 说明 |
|----|------|------|------|
| visitors | idx_visitors_fingerprint | UNIQUE | 访客去重 |
| visitors | idx_visitors_last_seen | BTREE DESC | 最近活跃访客查询 |
| conversations | idx_conversations_session_token | UNIQUE | 会话token快速查找 |
| conversations | idx_conversations_status | Partial WHERE | 活跃会话列表 |
| conversations | idx_conversations_created | BTREE DESC | 时间排序 |
| messages | idx_messages_conversation | BTREE (conversation_id, created_at DESC) | 对话消息历史查询 |
| messages | idx_messages_intent | BTREE (intent, created_at DESC) | 意图分类统计 |
| messages | idx_messages_feedback | Partial WHERE | 差评消息追踪 |
| admin_users | idx_admin_username | UNIQUE | 登录查询 |
| knowledge_docs | idx_kdocs_active | Partial WHERE | 活跃知识库列表 |
| knowledge_chunks | idx_kchunks_document | BTREE | 文档→分块关联 |
| knowledge_chunks | idx_kchunks_vector | BTREE | 向量ID反查 |
| work_orders | idx_workorders_status | BTREE | 工单状态筛选 |
| work_orders | idx_workorders_assignee | BTREE | 客服工单列表 |
| rate_limits | idx_ratelimit_key | UNIQUE | 限流key查找 |
| system_configs | idx_sysconfig_key | UNIQUE | 配置key查找 |

---

## 五、数据归档与清理策略

### 5.1 消息数据归档

| 策略 | 说明 |
|------|------|
| **热数据** | 近3个月消息保留在主表活跃分区中 |
| **温数据** | 3-12个月消息保留在主表（性能可接受） |
| **冷数据** | 超过12个月的消息分区从主表detach，迁移至归档Schema `archive` |
| **删除** | 归档超过2年的消息分区可以DROP（需人工确认） |

执行方式：每月1日通过PG Cron自动执行分区detach/迁移。

### 5.2 会话数据清理

- 会话记录保留3年（企业合规基线）
- 超过3年且status=closed的会话，导出至CSV后删除
- 关联messages已通过分区管理，不受此影响

### 5.3 知识库文档

- 旧版本文档（is_active=false且deleted_at NOT NULL）保留6个月后物理删除
- MinIO中对应的文件同步删除

---

## 六、数据库初始化Seed数据

```typescript
// prisma/seed.ts 关键seed
const seedData = {
  // 默认超级管理员
  adminUsers: [{
    username: 'admin',
    passwordHash: await bcrypt.hash('admin123!', 12), // 首次登录强制修改
    displayName: '系统管理员',
    role: 'super_admin',
    email: 'admin@xinding.com',
  }],

  // 系统配置默认值
  systemConfigs: [
    { configKey: 'agent.confidence_threshold', configValue: 0.6 },
    { configKey: 'agent.max_tokens_per_conversation', configValue: 4096 },
    { configKey: 'agent.sliding_window_size', configValue: 10 },
    { configKey: 'rag.top_k', configValue: 5 },
    { configKey: 'rag.similarity_threshold', configValue: 0.7 },
    { configKey: 'rag.hybrid_search_weight', configValue: 0.7 },
    { configKey: 'chat.idle_timeout_minutes', configValue: 30 },
    { configKey: 'agent.rate_limit.max', configValue: 30 },
  ]
};
```

---

## 七、Migration管理

使用Prisma Migrate进行版本管理：

```bash
# 开发环境
pnpm run db:migrate:dev      # 创建新migration
pnpm run db:studio           # Prisma Studio可视化查看

# 生产环境
pnpm run db:migrate:deploy   # 应用migration

# 分区创建脚本（独立于Prisma migration）
psql -f scripts/create-partitions.sql
```
