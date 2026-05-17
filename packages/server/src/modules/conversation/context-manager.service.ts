import { Injectable } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface ConversationContext {
  conversationId: string;
  summary: string;
  slidingWindow: Array<{ role: string; content: string; timestamp: string }>;
  extractedSlots: Record<string, string>;
  intentHistory: Array<{ intent: string; changedAt: string }>;
  totalTokensUsed: number;
}

@Injectable()
export class ContextManagerService {
  private readonly maxWindowSize = 10;
  private readonly maxTokens = 4096;

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getContext(conversationId: string): Promise<ConversationContext> {
    const cached = await this.redis.get(`conv:context:${conversationId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // 从数据库重建上下文
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: this.maxWindowSize * 2,
    });

    const slidingWindow = messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt.toISOString(),
    }));

    return {
      conversationId,
      summary: '',
      slidingWindow,
      extractedSlots: {},
      intentHistory: [],
      totalTokensUsed: 0,
    };
  }

  async updateContext(
    conversationId: string,
    message: { role: string; content: string },
  ): Promise<void> {
    const context = await this.getContext(conversationId);
    context.slidingWindow.push({
      ...message,
      timestamp: new Date().toISOString(),
    });

    // 保持滑动窗口大小
    if (context.slidingWindow.length > this.maxWindowSize + 2) {
      const toSummarize = context.slidingWindow.splice(0, 5);
      context.summary = await this.generateSummary(toSummarize, context.summary);
    }

    await this.redis.set(
      `conv:context:${conversationId}`,
      JSON.stringify(context),
      1800, // 30min TTL
    );
  }

  private async generateSummary(
    oldMessages: Array<{ role: string; content: string }>,
    currentSummary: string,
  ): Promise<string> {
    // 简单的摘要拼接（生产环境可调用DeepSeek轻量生成）
    const excerpts = oldMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.slice(0, 50))
      .join('; ');

    return currentSummary ? `${currentSummary}; ${excerpts}` : excerpts;
  }
}
