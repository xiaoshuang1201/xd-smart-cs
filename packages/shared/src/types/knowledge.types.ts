export interface KnowledgeDoc {
  id: string;
  title: string;
  description?: string;
  fileType: string;
  filePath: string;
  fileSize?: number;
  version: string;
  chunkCount: number;
  status: KnowledgeDocStatus;
  isActive: boolean;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeDocStatus = 'processing' | 'active' | 'error' | 'archived';

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  vectorId?: string;
  metadata?: Record<string, unknown>;
}
