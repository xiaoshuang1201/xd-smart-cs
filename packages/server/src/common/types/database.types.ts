import type { ConversationStatus, MessageRole, KnowledgeDocStatus } from '@xd/shared';

export type { ConversationStatus, MessageRole, KnowledgeDocStatus };

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}
