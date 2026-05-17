export interface EmbeddingRequest {
  inputs: string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model?: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
