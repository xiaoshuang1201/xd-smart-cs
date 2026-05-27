# 新鼎电炉科技——智能客服系统 API接口设计

## 一、设计规范

### 1.1 基础约定

| 项目 | 规范 |
|------|------|
| 协议 | HTTPS（开发环境HTTP） |
| API版本 | URL路径版本：`/api/v1/` |
| 数据格式 | JSON（请求/响应均为 `application/json`） |
| 字符编码 | UTF-8 |
| 时间戳格式 | ISO 8601，UTC时区（`2026-05-16T08:30:00.000Z`） |
| 分页参数 | `page`(页码, 从1开始), `pageSize`(每页条数, 默认20, 最大100) |
| 文档工具 | Swagger (Nest.js `@nestjs/swagger` 自动生成) |

### 1.2 统一响应格式

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-16T08:30:00.000Z",
    "requestId": "req_uuid_xxxx"
  }
}
```

#### 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-05-16T08:30:00.000Z",
    "requestId": "req_uuid_xxxx",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

#### 错误响应

```json
{
  "code": 40001,
  "message": "参数校验失败：问题内容不能为空",
  "data": null,
  "meta": {
    "timestamp": "2026-05-16T08:30:00.000Z",
    "requestId": "req_uuid_xxxx"
  }
}
```

### 1.3 错误码体系

| 错误码范围       | 类别     | 说明                         |
| ----------- | ------ | -------------------------- |
| 0           | 成功     | 请求成功                       |
| 40001-40099 | 参数错误   | 参数校验失败、缺少必填字段              |
| 40101-40199 | 鉴权错误   | 未登录、Token过期、权限不足           |
| 40301-40399 | 禁止访问   | 无权操作该资源、IP被封               |
| 40401-40499 | 资源不存在  | 会话不存在、文档不存在                |
| 40901-40999 | 冲突     | 重复提交、状态冲突                  |
| 42901-42999 | 限流     | 请求频率超限                     |
| 50001-50099 | 服务端错误  | 内部异常、数据库连接失败               |
| 50201-50299 | AI服务错误 | Dify调用失败、DeepSeek超时、向量检索异常 |
| 50301-50399 | 服务降级   | 功能暂不可用、人工客服离线              |

**详细错误码列表**:

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 0 | 200/201 | 成功 |
| 40001 | 400 | 参数校验失败 |
| 40002 | 400 | 缺少必填参数 |
| 40003 | 400 | 参数格式不正确 |
| 40101 | 401 | 未提供认证Token |
| 40102 | 401 | Token已过期 |
| 40103 | 401 | Token无效/被篡改 |
| 40104 | 401 | 管理员账号已被禁用 |
| 40301 | 403 | 权限不足 |
| 40302 | 403 | 会话不属于该访客 |
| 40401 | 404 | 会话不存在 |
| 40402 | 404 | 消息不存在 |
| 40403 | 404 | 知识文档不存在 |
| 40404 | 404 | 工单不存在 |
| 40901 | 409 | 会话已关闭 |
| 40902 | 409 | 重复提交反馈 |
| 42901 | 429 | 请求过于频繁，请稍后重试 |
| 42902 | 429 | Token额度超限 |
| 50001 | 500 | 服务器内部错误 |
| 50002 | 500 | 数据库操作失败 |
| 50201 | 502 | Dify服务调用失败 |
| 50202 | 502 | DeepSeek API调用超时 |
| 50203 | 502 | 向量检索服务异常 |
| 50204 | 502 | Embedding服务异常 |
| 50301 | 503 | 知识库处理中，暂时不可用 |
| 50302 | 503 | 人工客服不在线 |

---

## 二、鉴权方案

### 2.1 访客端鉴权

```
流程：
1. 访客首次打开聊天窗口 → 前端调用 POST /api/v1/auth/session 获取 session_token
2. 后续所有请求携带 Header: X-Session-Token: {session_token}
3. session_token 有效期：24小时（Redis存储）
4. 过期后自动续期：任何有效请求自动续期24小时
5. CSRF防护：同时返回 csrf_token，后续非GET请求需携带 X-CSRF-Token Header
```

### 2.2 管理后台鉴权

```
流程：
1. 管理员登录 → POST /api/v1/admin/auth/login 获取 JWT access_token + refresh_token
2. 后续请求携带 Header: Authorization: Bearer {access_token}
3. access_token 有效期：2小时
4. refresh_token 有效期：7天
5. 刷新流程：POST /api/v1/admin/auth/refresh 使用 refresh_token 获取新 access_token
```

### 2.3 JWT Payload结构

```json
{
  "sub": "admin_user_uuid",
  "username": "admin",
  "role": "super_admin",
  "displayName": "系统管理员",
  "iat": 1715848200,
  "exp": 1715855400,
  "type": "access"
}
```

---

## 三、访客端API（官网前端调用）

### 3.1 会话管理

#### `POST /api/v1/auth/session` — 创建/续期访客会话

> **说明**：访客首次打开聊天窗口时调用，获取会话凭证。

```
Request:
  Body (可选):
  {
    "fingerprint": "sha256_hash_of_browser_fingerprint",  // 浏览器指纹
    "sourcePage": "https://xinding.com/products/igbt-001", // 发起页面
    "sourceContext": {                                      // 页面上下文
      "productId": "igbt-001",
      "category": "中频炉"
    }
  }

Response 201:
  {
    "code": 0,
    "data": {
      "sessionToken": "sess_xxxxxx",         // 会话Token，后续请求携带
      "csrfToken": "csrf_xxxxxx",             // CSRF Token
      "conversationId": "uuid_conv_xxxx",     // 对话ID
      "greeting": "您好！我是新鼎电炉智能客服，请问有什么可以帮您？",
      "suggestedQuestions": [                 // 建议问题（基于页面上下文）
        "这个产品的功率范围是多少？",
        "可以给我报个价吗？",
        "节电率大概有多高？"
      ]
    }
  }
```

#### `GET /api/v1/auth/session` — 验证会话有效性

```
Request:
  Header: X-Session-Token: {session_token}

Response 200:
  {
    "code": 0,
    "data": {
      "valid": true,
      "expiresAt": "2026-05-17T08:30:00.000Z"
    }
  }
```

---

### 3.2 对话消息

#### `POST /api/v1/conversations/:id/messages` — 发送消息

> **说明**：发送用户消息，返回消息ID。Agent的实际回复通过SSE推送。

```
Request:
  Header: X-Session-Token: {session_token}
  Header: X-CSRF-Token: {csrf_token}
  Path: id = conversation_id
  Body:
  {
    "content": "800公斤钢料用多大功率的中频炉合适？",
    "sourcePage": "https://xinding.com/products/igbt-001"
  }

Response 201:
  {
    "code": 0,
    "data": {
      "messageId": "uuid_msg_xxxx",
      "conversationId": "uuid_conv_xxxx",
      "role": "user",
      "content": "800公斤钢料用多大功率的中频炉合适？",
      "createdAt": "2026-05-16T08:30:00.000Z",
      "sseStreamUrl": "/api/v1/conversations/uuid_conv_xxxx/stream"
    }
  }
```

#### `GET /api/v1/conversations/:id/messages` — 获取对话历史

```
Request:
  Header: X-Session-Token: {session_token}
  Path: id = conversation_id
  Query:
    page: 1          (页码)
    pageSize: 50     (每页条数)
    order: asc       (asc/desc，按时间排序)

Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_msg_001",
        "role": "user",
        "content": "你好，我想了解IGBT中频炉",
        "createdAt": "2026-05-16T08:29:00.000Z"
      },
      {
        "id": "uuid_msg_002",
        "role": "assistant",
        "content": "您好！很高兴为您介绍IGBT中频炉...",
        "intent": "product_inquiry",
        "confidenceScore": 0.92,
        "retrievalSources": [
          {
            "documentId": "uuid_doc_001",
            "documentTitle": "IGBT中频炉产品手册V2.0",
            "chunkIndex": 5,
            "score": 0.89
          }
        ],
        "feedback": null,    // null/helpful/unhelpful
        "createdAt": "2026-05-16T08:29:05.000Z"
      }
    ],
    "meta": {
      "pagination": { "page": 1, "pageSize": 50, "total": 12, "totalPages": 1 }
    }
  }
```

#### `GET /api/v1/conversations/:id/stream` — SSE流式接收Agent回复

> **说明**：此接口使用 Server-Sent Events (SSE) 协议。客户端建立长连接，服务端逐字推送Agent回复。
> 调用时机：发送消息后，根据返回的sseStreamUrl建立SSE连接。

```
Request:
  Header: X-Session-Token: {session_token}
  Header: Accept: text/event-stream
  Path: id = conversation_id
  Query:
    messageId: uuid_msg_xxxx    (对应POST消息返回的ID)

SSE Events:

  event: thinking
  data: {"phase": "intent_recognition", "message": "正在理解您的问题..."}

  event: searching
  data: {"phase": "rag_retrieval", "message": "正在查找相关资料...", "sourcesFound": 5}

  event: generating
  data: {"phase": "answer_generation", "message": "正在为您生成答案..."}

  event: token
  data: {"content": "根据", "index": 0}

  event: token
  data: {"content": "您", "index": 1}

  event: token
  data: {"content": "提供", "index": 2}
  ... (逐字推送)

  event: done
  data: {
    "messageId": "uuid_msg_002",
    "intent": "product_inquiry",
    "confidenceScore": 0.92,
    "retrievalSources": [ ... ],
    "tokensUsed": 450,
    "fullContent": "根据您提供的800公斤钢料...（完整内容）"
  }

  event: error
  data: {
    "code": 50202,
    "message": "AI服务响应超时，请稍后重试"
  }

  event: need_transfer
  data: {
    "message": "您的问题比较复杂，我无法准确回答，是否为您转接人工客服？",
    "confidenceScore": 0.45
  }
```

#### `POST /api/v1/messages/:id/feedback` — 消息反馈

```
Request:
  Header: X-Session-Token: {session_token}
  Header: X-CSRF-Token: {csrf_token}
  Path: id = message_id
  Body:
  {
    "rating": "helpful",        // helpful | unhelpful
    "detail": "回答很详细"       // 可选，unhelpful时建议必填
  }

Response 200:
  {
    "code": 0,
    "data": { "accepted": true }
  }

Error 40901 (重复反馈):
  { "code": 40902, "message": "您已对该回答进行过反馈" }
```

---

### 3.3 转人工

#### `POST /api/v1/conversations/:id/transfer` — 请求转人工

```
Request:
  Header: X-Session-Token: {session_token}
  Header: X-CSRF-Token: {csrf_token}
  Path: id = conversation_id
  Body:
  {
    "reason": "问题太过复杂，AI无法解答",
    "contact": "138xxxx1234",   // 客户联系方式（可选）
    "contactType": "phone"      // phone / email / wechat
  }

Response 201:
  {
    "code": 0,
    "data": {
      "workOrderId": "uuid_wo_xxxx",
      "message": "已为您创建工单，我们的技术专家将在工作时间内尽快联系您。",
      "estimatedResponseTime": "2小时内"
    }
  }
```

---

### 3.4 会话管理

#### `GET /api/v1/conversations` — 获取访客历史会话列表

```
Request:
  Header: X-Session-Token: {session_token}
  Query:
    page: 1
    pageSize: 10

Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_conv_001",
        "status": "closed",
        "sourcePage": "https://xinding.com/products/igbt-001",
        "messageCount": 8,
        "firstMessage": "你好，我想了解IGBT中频炉",  // 首条用户消息摘要
        "createdAt": "2026-05-15T10:00:00.000Z",
        "closedAt": "2026-05-15T10:15:00.000Z"
      }
    ],
    "meta": { "pagination": { ... } }
  }
```

#### `POST /api/v1/conversations/:id/close` — 关闭会话

```
Request:
  Header: X-Session-Token: {session_token}
  Header: X-CSRF-Token: {csrf_token}
  Path: id = conversation_id

Response 200:
  {
    "code": 0,
    "data": { "closed": true, "closedAt": "2026-05-16T08:45:00.000Z" }
  }
```

---

## 四、管理后台API（Vue 3管理后台调用）

**所有管理后台API需携带**: `Authorization: Bearer {access_token}`

### 4.1 认证

#### `POST /api/v1/admin/auth/login` — 管理员登录

```
Request:
  Body:
  {
    "username": "admin",
    "password": "xxxxxx"
  }

Response 200:
  {
    "code": 0,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "expiresIn": 7200,
      "user": {
        "id": "uuid_admin_001",
        "username": "admin",
        "displayName": "系统管理员",
        "role": "super_admin",
        "avatarUrl": null
      }
    }
  }
```

#### `POST /api/v1/admin/auth/refresh` — 刷新Token

```
Request:
  Body: { "refreshToken": "eyJhbGciOi..." }
Response 200:
  {
    "code": 0,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "expiresIn": 7200
    }
  }
```

#### `POST /api/v1/admin/auth/logout` — 退出登录

```
Response 200: { "code": 0, "data": { "loggedOut": true } }
```

#### `GET /api/v1/admin/auth/me` — 获取当前用户信息

```
Response 200:
  {
    "code": 0,
    "data": {
      "id": "uuid_admin_001",
      "username": "admin",
      "displayName": "系统管理员",
      "role": "super_admin",
      "email": "admin@xinding.com",
      "lastLoginAt": "2026-05-16T08:00:00.000Z"
    }
  }
```

---

### 4.2 数据看板

#### `GET /api/v1/admin/dashboard/overview` — 核心指标概览

```
Request:
  Query:
    startDate: "2026-05-01"      // 统计开始日期
    endDate: "2026-05-16"        // 统计结束日期

Response 200:
  {
    "code": 0,
    "data": {
      "totalConversations": 1250,       // 总会话数
      "totalMessages": 8530,            // 总消息数
      "avgConfidence": 0.87,            // 平均置信度
      "transferRate": 0.12,             // 转人工率
      "helpfulRate": 0.82,              // 好评率
      "avgResponseTimeMs": 1850,        // 平均首包响应时间(ms)
      "avgTokensPerConversation": 1200, // 平均Token消耗/会话
      "dailyTrend": [                   // 日趋势（用于折线图）
        { "date": "2026-05-10", "conversations": 95, "transfers": 12 },
        { "date": "2026-05-11", "conversations": 102, "transfers": 10 },
        ...
      ],
      "intentDistribution": [           // 意图分布（用于饼图）
        { "intent": "product_inquiry", "count": 450, "percentage": 0.36 },
        { "intent": "price", "count": 280, "percentage": 0.22 },
        { "intent": "after_sales", "count": 180, "percentage": 0.14 },
        { "intent": "chat", "count": 200, "percentage": 0.16 },
        { "intent": "transfer", "count": 140, "percentage": 0.12 }
      ],
      "hourlyDistribution": [           // 小时分布（用于柱状图）
        { "hour": 9, "count": 180 },
        { "hour": 10, "count": 220 },
        ...
      ]
    }
  }
```

#### `GET /api/v1/admin/dashboard/hot-questions` — 热问Top N

```
Request:
  Query:
    startDate: "2026-05-01"
    endDate: "2026-05-16"
    limit: 20

Response 200:
  {
    "code": 0,
    "data": [
      { "question": "IGBT中频炉价格多少？", "count": 85, "avgConfidence": 0.78 },
      { "question": "800公斤钢料用多大功率？", "count": 63, "avgConfidence": 0.91 },
      ...
    ]
  }
```

#### `GET /api/v1/admin/dashboard/unanswered-questions` — 未命中/低质量回答清单

```
Request:
  Query: similar to above, plus:
    confidenceThreshold: 0.6    // 只展示置信度低于此值的
    limit: 20

Response 200:
  {
    "code": 0,
    "data": [
      {
        "messageId": "uuid_msg_xxx",
        "question": "IGBT模块的散热器规格怎么选？",
        "confidenceScore": 0.35,
        "intent": "product_inquiry",
        "occurredAt": "2026-05-16T09:00:00.000Z",
        "retrievalCount": 1    // 检索到相关文档数
      },
      ...
    ]
  }
```

---

### 4.3 对话管理

#### `GET /api/v1/admin/conversations` — 对话列表

```
Request:
  Query:
    page: 1
    pageSize: 20
    status: active              // active / closed / transferred (可选)
    intent: product_inquiry     // 意图筛选 (可选)
    startDate: "2026-05-01"    (可选)
    endDate: "2026-05-16"      (可选)
    keyword: "功率"             // 内容搜索 (可选)
    sortBy: createdAt           // createdAt / messageCount / updatedAt
    sortOrder: desc

Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_conv_001",
        "visitorFingerprint": "sha256_hash",
        "status": "active",
        "sourcePage": "https://xinding.com/products/igbt-001",
        "messageCount": 12,
        "firstMessage": "你好，我想了解...",
        "lastMessage": "好的谢谢",
        "agentConfidence": 0.87,
        "createdAt": "2026-05-16T09:00:00.000Z",
        "updatedAt": "2026-05-16T09:15:00.000Z"
      }
    ],
    "meta": { "pagination": { ... } }
  }
```

#### `GET /api/v1/admin/conversations/:id` — 对话详情（含全部消息）

```
Response 200:
  {
    "code": 0,
    "data": {
      "id": "uuid_conv_001",
      "visitor": {
        "fingerprint": "sha256_hash",
        "ipAddress": "192.168.1.1",
        "firstSeenAt": "2026-05-10T08:00:00.000Z",
        "visitCount": 5
      },
      "status": "active",
      "sourcePage": "...",
      "sourceContext": { ... },
      "messages": [
        {
          "id": "uuid_msg_001",
          "role": "user",
          "content": "...",
          "createdAt": "..."
        },
        {
          "id": "uuid_msg_002",
          "role": "assistant",
          "content": "...",
          "intent": "product_inquiry",
          "confidenceScore": 0.92,
          "retrievalSources": [ ... ],
          "feedback": "helpful",
          "feedbackDetail": null,
          "tokensUsed": 350,
          "createdAt": "..."
        }
      ],
      "workOrder": null,     // 如果已转人工，返回工单信息
      "createdAt": "2026-05-16T09:00:00.000Z"
    }
  }
```

#### `GET /api/v1/admin/conversations/stats` — 对话统计数据

```
Response 200:
  {
    "code": 0,
    "data": {
      "todayActive": 8,
      "todayTotal": 42,
      "avgResponseTimeMs": 1850,
      "pendingTransfer": 3
    }
  }
}
```

---

### 4.4 知识库管理

#### `GET /api/v1/admin/knowledge/documents` — 文档列表

```
Request:
  Query:
    page: 1
    pageSize: 20
    status: active               // processing / active / error / archived
    fileType: pdf               // 文件类型筛选
    keyword: "产品手册"          // 标题搜索
    sortBy: createdAt
    sortOrder: desc

Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_doc_001",
        "title": "IGBT中频炉产品手册V2.0",
        "description": "包含全系列产品参数、技术规格",
        "fileType": "pdf",
        "fileSize": 5242880,
        "version": "2.0",
        "versionLabel": "2026年新版手册",
        "chunkCount": 45,
        "totalTokens": 28400,
        "status": "active",
        "isActive": true,
        "uploadedBy": { "id": "...", "displayName": "产品经理" },
        "processedAt": "2026-05-10T10:00:00.000Z",
        "createdAt": "2026-05-10T09:00:00.000Z"
      }
    ],
    "meta": { "pagination": { ... } }
  }
```

#### `POST /api/v1/admin/knowledge/documents` — 上传文档

```
Request:
  Content-Type: multipart/form-data
  Fields:
    file: (binary)               // PDF/Word/Excel/PPT/TXT/MD文件
    title: "IGBT中频炉产品手册V2.0"
    description: "包含全系列产品参数"   // 可选
    version: "2.0"
    versionLabel: "2026年新版"         // 可选
    isActive: true                     // 是否立即启用

  Limits:
    maxFileSize: 50MB
    allowedTypes: [pdf, docx, xlsx, pptx, txt, md]

Response 201:
  {
    "code": 0,
    "data": {
      "id": "uuid_doc_001",
      "status": "processing",
      "message": "文档上传成功，正在解析处理中...",
      "estimatedProcessingTime": "约30秒-2分钟"
    }
  }
```

#### `GET /api/v1/admin/knowledge/documents/:id` — 文档详情

```
Response 200:
  {
    "code": 0,
    "data": {
      "id": "uuid_doc_001",
      ... (all fields),
      "chunks": [                     // 分块列表（预览前20个）
        {
          "id": "uuid_chunk_001",
          "chunkIndex": 0,
          "content": "IGBT中频炉是一种...",
          "tokenCount": 512,
          "metadata": { "page": 1, "section": "产品概述" }
        },
        ...
      ]
    }
  }
```

#### `PATCH /api/v1/admin/knowledge/documents/:id` — 更新文档配置

```
Request:
  Body:
  {
    "title": "更新后的标题",      // 可选
    "description": "...",        // 可选
    "isActive": true             // 可选：启用/禁用（A/B测试用）
  }

Response 200: { "code": 0, "data": { "updated": true } }
```

#### `DELETE /api/v1/admin/knowledge/documents/:id` — 软删除文档

```
Response 200: { "code": 0, "data": { "deleted": true, "deletedAt": "..." } }
```

#### `POST /api/v1/admin/knowledge/documents/:id/reprocess` — 重新处理文档

```
Response 201: { "code": 0, "data": { "status": "processing" } }
```

#### `POST /api/v1/admin/knowledge/preview` — 知识库预览测试

```
Request:
  Body:
  {
    "question": "800公斤钢料用多大功率？",
    "documentIds": ["uuid_doc_001", "uuid_doc_002"],  // 可选：限定搜索范围
    "topK": 5                                          // 可选
  }

Response 200:
  {
    "code": 0,
    "data": {
      "question": "800公斤钢料用多大功率？",
      "retrievalResults": [
        {
          "chunkId": "uuid_chunk_015",
          "documentTitle": "IGBT中频炉产品手册V2.0",
          "chunkIndex": 15,
          "content": "根据选型公式：P = G × 0.4...",
          "score": 0.93,
          "metadata": { "page": 12, "section": "选型指南" }
        },
        ...
      ],
      "generatedAnswer": "根据选型指南，800公斤钢料建议使用320-400KW功率...",
      "tokensUsed": 380,
      "responseTimeMs": 1200
    }
  }
```

#### `GET /api/v1/admin/knowledge/versions` — 文档版本历史

```
Response 200:
  {
    "code": 0,
    "data": [
      {
        "title": "产品手册",
        "versions": [
          { "version": "2.0", "id": "uuid_doc_001", "isActive": true, "createdAt": "..." },
          { "version": "1.0", "id": "uuid_doc_000", "isActive": false, "createdAt": "..." }
        ]
      }
    ]
  }
```

---

### 4.5 工单管理

#### `GET /api/v1/admin/workorders` — 工单列表

```
Request:
  Query:
    page: 1
    pageSize: 20
    status: pending              // pending / processing / resolved / closed
    priority: high               // low / medium / high / urgent
    assigneeId: uuid_xxx        // 按客服筛选
    startDate: "2026-05-01"
    endDate: "2026-05-16"
    keyword: "不加热"            // 标题/描述搜索

Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_wo_001",
        "conversationId": "uuid_conv_001",
        "title": "设备不加热故障排查",
        "status": "pending",
        "priority": "high",
        "customerContact": "138xxxx1234",
        "aiSummary": "客户反馈IGBT中频炉使用3个月后出现不加热问题...",
        "assignee": null,
        "createdAt": "2026-05-16T10:00:00.000Z"
      }
    ],
    "meta": { "pagination": { ... } }
  }
```

#### `GET /api/v1/admin/workorders/:id` — 工单详情

```
Response 200:
  {
    "code": 0,
    "data": {
      "id": "uuid_wo_001",
      ... (all fields),
      "conversation": {         // 关联的对话摘要
        "id": "uuid_conv_001",
        "messageCount": 10,
        "firstMessage": "...",
        "messages": [ ... ]      // 完整的对话历史
      },
      "assignee": {             // 处理的客服
        "id": "uuid_admin_002",
        "displayName": "张工"
      }
    }
  }
```

#### `PATCH /api/v1/admin/workorders/:id` — 更新工单

```
Request:
  Body (全部可选):
  {
    "status": "processing",
    "priority": "urgent",
    "assigneeId": "uuid_admin_002",
    "resolutionNotes": "已联系客户，判断为熔断器损坏..."
  }

Response 200: { "code": 0, "data": { "updated": true } }
```

#### `GET /api/v1/admin/workorders/stats` — 工单统计

```
Response 200:
  {
    "code": 0,
    "data": {
      "pending": 5,
      "processing": 3,
      "resolved": 42,
      "closed": 128,
      "today": 8,
      "avgResolutionTimeHours": 4.5
    }
  }
}
```

---

### 4.6 Agent配置

#### `GET /api/v1/admin/agent/configs` — 获取Agent配置

```
Response 200:
  {
    "code": 0,
    "data": {
      "greetingMessage": "您好！我是新鼎电炉智能客服，请问有什么可以帮您？",
      "confidenceThreshold": 0.6,
      "maxTokensPerConversation": 4096,
      "slidingWindowSize": 10,
      "defaultFallbackMessage": "抱歉，我暂时无法回答这个问题，请问还有其他需要吗？",
      "transferPrompt": "您的问题比较复杂，是否为您转接人工客服？",
      "brandTone": "professional",       // professional / friendly / concise
      "priceStrategy": "range_only",     // range_only(只给价格区间) / guide_to_form(引导填询价表单) / direct(直接报价)
      "allowedIntents": [                // 启用的意图类型
        "product_inquiry",
        "price",
        "after_sales",
        "selection",
        "chat",
        "transfer"
      ]
    }
  }
```

#### `PATCH /api/v1/admin/agent/configs` — 更新Agent配置

```
Request:
  Body: (全部可选，只传需要更新的字段)
  {
    "greetingMessage": "新的欢迎语...",
    "confidenceThreshold": 0.55
  }

Response 200: { "code": 0, "data": { "updated": true, "updatedFields": ["greetingMessage", "confidenceThreshold"] } }
```

---

### 4.7 系统管理

#### `GET /api/v1/admin/users` — 管理员列表

```json
// 需要 role=super_admin
Response 200:
  {
    "code": 0,
    "data": [
      {
        "id": "uuid_admin_001",
        "username": "admin",
        "displayName": "系统管理员",
        "role": "super_admin",
        "status": "active",
        "lastLoginAt": "2026-05-16T08:00:00.000Z"
      }
    ]
  }
```

#### `POST /api/v1/admin/users` — 创建管理员

```
Request (super_admin only):
  Body:
  {
    "username": "zhang_san",
    "password": "tempPass123!",
    "displayName": "张三",
    "role": "customer_service",
    "email": "zhangsan@xinding.com"
  }

Response 201: { "code": 0, "data": { "id": "...", "created": true } }
```

#### `PATCH /api/v1/admin/users/:id` / `PATCH /api/v1/admin/users/:id/reset-password`

```json
// 标准管理操作，略
```

#### `GET /api/v1/admin/settings` / `PATCH /api/v1/admin/settings` — 系统设置

```
// 对应 system_configs 表的CRUD
```

---

## 五、内部服务API（Nest.js内部/Dify回调）

### 5.1 Dify 代理接口

#### `POST /api/v1/internal/dify/chat` — 调用Dify对话API

```
说明：Agent模块内部调用，Nest.js作为代理转发至Dify

Request:
  Body:
  {
    "query": "800公斤钢料用多大功率？",
    "conversationId": "uuid_conv_001",
    "user": "visitor_sha256_fingerprint",
    "inputs": {
      "sourcePage": "...",
      "sourceContext": { ... },
      "history": [ ... ]        // 上下文摘要/历史
    },
    "responseMode": "streaming"  // streaming | blocking
  }

Response (blocking mode):
  { "answer": "...", "conversationId": "...", "metadata": { ... } }

Response (streaming mode):
  SSE事件流转发（对前端的SSE端点直接透传Dify的流式响应）
```

### 5.2 知识库处理回调

#### `POST /api/v1/internal/knowledge/process` — 文档解析+向量化任务

```
说明：文档上传后，异步触发解析→分块→向量化→入库管道

Request:
  Body:
  {
    "documentId": "uuid_doc_001",
    "filePath": "knowledge-docs/2026/05/uuid_doc_001.pdf",
    "fileType": "pdf"
  }

处理流程:
  1. 下载MinIO文件
  2. 解析文档内容（PDF → 文本 / Word → 文本 ...）
  3. 语义分块（按段落+重叠窗口）
  4. 调用 BGE Embedding 服务生成向量
  5. 向量写入 Milvus
  6. 分块元数据写入 PostgreSQL (knowledge_chunks)
  7. 更新 knowledge_docs.status = 'active'
```

---

## 六、接口安全

### 6.1 安全Header要求

| Header          | 说明                          |
| --------------- | --------------------------- |
| X-Session-Token | 访客会话凭证（访客API必需）             |
| X-CSRF-Token    | CSRF防护Token（访客非GET请求必需）     |
| Authorization   | Bearer JWT Token（管理后台API必需） |
| X-Request-ID    | 请求追踪ID（可选，未提供则服务端生成）        |

### 6.2 请求限流

| 端点 | 限流策略 | 说明 |
|------|----------|------|
| `/api/v1/auth/session` | 每IP 10次/分钟 | 防止恶意创建会话 |
| `/api/v1/conversations/:id/messages` | 每会话 20次/分钟 | 防止快速刷消息 |
| `/api/v1/conversations/:id/stream` | 每会话 1个并发SSE连接 | 防止连接数爆炸 |
| `/api/v1/admin/auth/login` | 每IP 5次/分钟 | 防暴力破解 |
| 所有管理后台API | 每用户 60次/分钟 | 全局管理API限流 |

### 6.3 敏感词过滤

- 用户输入需经敏感词库过滤后，才能转发至Dify
- Agent生成内容也需过滤后，才能推送给前端
- 过滤到敏感词时，用户端返回礼貌性拒绝，不暴露过滤规则

---

## 七、Swagger文档配置

```typescript
// main.ts Swagger配置
const swaggerConfig = new DocumentBuilder()
  .setTitle('新鼎电炉智能客服系统 API')
  .setDescription('XD-Agent-RAG-2026 接口文档')
  .setVersion('1.0')
  .addBearerAuth()
  .addApiKey({ type: 'apiKey', name: 'X-Session-Token', in: 'header' }, 'session-token')
  .addTag('访客端 - 会话', '访客会话创建与管理')
  .addTag('访客端 - 对话', '消息发送与历史查询')
  .addTag('管理后台 - 数据看板', '核心指标与统计')
  .addTag('管理后台 - 对话管理', '对话记录查看与管理')
  .addTag('管理后台 - 知识库', '文档上传与管理')
  .addTag('管理后台 - 工单', '工单管理与跟踪')
  .addTag('管理后台 - Agent配置', 'Agent行为配置')
  .addTag('管理后台 - 系统', '用户与系统设置')
  .build();
```
