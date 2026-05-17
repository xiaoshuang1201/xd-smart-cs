export interface Conversation {
  id: string;
  visitorId: string;
  sessionToken: string;
  status: ConversationStatus;
  sourcePage?: string;
  sourceContext?: Record<string, unknown>;
  messageCount: number;
  agentConfidence?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export type ConversationStatus = 'active' | 'closed' | 'transferred';

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  confidenceScore?: number;
  retrievalSources?: RetrievalSource[];
  feedback?: 'helpful' | 'unhelpful';
  tokensUsed?: number;
  createdAt: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface RetrievalSource {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  score: number;
}
