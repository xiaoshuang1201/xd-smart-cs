export interface DifyChatRequest {
  query: string;
  conversation_id?: string;
  user: string;
  inputs?: Record<string, unknown>;
  response_mode?: 'streaming' | 'blocking';
  files?: Array<{
    type: string;
    transfer_method: string;
    url: string;
  }>;
}

export interface DifyChatResponse {
  answer: string;
  conversation_id: string;
  message_id: string;
  created_at: number;
  metadata?: {
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    retriever_resources?: Array<{
      position: number;
      dataset_id: string;
      dataset_name: string;
      document_name: string;
      content: string;
      score: number;
    }>;
  };
}

export interface DifyStreamEvent {
  event: string;
  message_id?: string;
  conversation_id?: string;
  answer?: string;
  created_at?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}
