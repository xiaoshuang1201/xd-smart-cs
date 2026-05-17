import { Response } from 'express';

export interface SSEConnection {
  res: Response;
  heartbeatTimer: NodeJS.Timeout;
}

export interface SSEMessage {
  event: string;
  data: unknown;
}

export interface SSETokenEvent {
  type: 'token';
  content: string;
  index: number;
  conversationId: string;
}

export interface SSEDoneEvent {
  type: 'done';
  messageId: string;
  intent?: string;
  confidenceScore?: number;
  retrievalSources?: unknown[];
  tokensUsed?: number;
  fullContent: string;
}

export interface SSEErrorEvent {
  type: 'error';
  code: number;
  message: string;
}

export interface SSENeedTransferEvent {
  type: 'need_transfer';
  message: string;
  confidenceScore: number;
}

export type SSEEventData =
  | SSETokenEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSENeedTransferEvent;
