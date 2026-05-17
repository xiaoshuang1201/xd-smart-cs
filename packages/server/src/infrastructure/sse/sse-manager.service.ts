import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Response } from 'express';
import type { SSEConnection } from './sse.types';

@Injectable()
export class SSEManagerService implements OnModuleDestroy {
  private readonly logger = new Logger(SSEManagerService.name);
  private readonly connections = new Map<string, SSEConnection>();
  private readonly MAX_CONNECTIONS = 1000;
  private readonly HEARTBEAT_INTERVAL = 30000;

  onModuleDestroy() {
    this.closeAll();
  }

  register(conversationId: string, res: Response): void {
    // 关闭旧连接
    const existing = this.connections.get(conversationId);
    if (existing) {
      clearInterval(existing.heartbeatTimer);
      existing.res.end();
    }

    // 限制最大连接数
    if (this.connections.size >= this.MAX_CONNECTIONS) {
      res.status(503).json({ code: 50303, message: '连接数已达上限' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // 心跳定时器
    const heartbeatTimer = setInterval(() => {
      this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }, this.HEARTBEAT_INTERVAL);

    // 注册清理回调
    res.on('close', () => {
      this.unregister(conversationId);
    });

    this.connections.set(conversationId, { res, heartbeatTimer });
    this.logger.log(
      `SSE connection registered: ${conversationId} (total: ${this.connections.size})`,
    );
  }

  unregister(conversationId: string): void {
    const conn = this.connections.get(conversationId);
    if (conn) {
      clearInterval(conn.heartbeatTimer);
      conn.res.end();
      this.connections.delete(conversationId);
      this.logger.log(
        `SSE connection removed: ${conversationId} (total: ${this.connections.size})`,
      );
    }
  }

  sendToConversation(conversationId: string, event: string, data: unknown): boolean {
    const conn = this.connections.get(conversationId);
    if (!conn) return false;

    try {
      this.sendEvent(conn.res, event, data);
      return true;
    } catch {
      this.unregister(conversationId);
      return false;
    }
  }

  broadcast(event: string, data: unknown): void {
    this.connections.forEach((conn) => {
      try {
        this.sendEvent(conn.res, event, data);
      } catch {
        // 连接可能已断开
      }
    });
  }

  isConnected(conversationId: string): boolean {
    return this.connections.has(conversationId);
  }

  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  closeAll(): void {
    for (const [id] of [...this.connections]) {
      this.unregister(id);
    }
  }

  private sendEvent(res: Response, event: string, data: unknown): void {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    res.write(`event: ${event}\ndata: ${payload}\n\n`);
  }
}
