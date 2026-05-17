export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  intent?: string
  confidenceScore?: number
  retrievalSources?: RetrievalSource[]
  feedback?: 'helpful' | 'unhelpful' | null
  tokensUsed?: number
  createdAt: string
}

export interface RetrievalSource {
  documentId: string
  documentTitle: string
  chunkIndex: number
  score: number
}

export interface SSETokenEvent {
  type: 'token'
  content: string
  index: number
}

export interface SSEDoneEvent {
  type: 'done'
  messageId: string
  intent?: string
  confidenceScore?: number
  retrievalSources?: RetrievalSource[]
  tokensUsed?: number
  fullContent: string
}

export interface SSEErrorEvent {
  type: 'error'
  code: number
  message: string
}

export interface SSENeedTransferEvent {
  type: 'need_transfer'
  message: string
  confidenceScore: number
}

export interface SSEThinkingEvent {
  type: 'thinking'
  phase: string
  message?: string
}

export interface SSESearchingEvent {
  type: 'searching'
  phase: string
  sourcesFound?: number
}

export type SSEEvent =
  | SSETokenEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSENeedTransferEvent
  | SSEThinkingEvent
  | SSESearchingEvent

export interface SessionData {
  sessionToken: string
  csrfToken: string
  conversationId: string
  greeting: string
  suggestedQuestions: string[]
}

export interface SendMessageResponse {
  messageId: string
  conversationId: string
  role: string
  content: string
  createdAt: string
  sseStreamUrl: string
}

export interface PageContext {
  pageType?: string
  productId?: string
  category?: string
  pageTitle?: string
}
