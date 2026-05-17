import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { DifyService } from '../../infrastructure/dify/dify.service';
import { IntentResolverService } from './intent-resolver.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import type { ConversationContext } from '../conversation/context-manager.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly difyService: DifyService,
    private readonly intentResolver: IntentResolverService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async generateResponse(
    query: string,
    context: ConversationContext,
    visitorId: string,
  ): Promise<Array<{ event: string; data: unknown }>> {
    const events: Array<{ event: string; data: unknown }> = [];

    // 1. 意图识别
    const intent = await this.intentResolver.resolve(query);
    events.push({
      event: 'thinking',
      data: { phase: 'intent_recognition', intent: intent.intent, confidence: intent.confidence },
    });

    // 2. 检查RAG缓存
    const questionHash = this.hashQuestion(query);
    const cached = await this.redis.hgetall(`rag:answer:${questionHash}`);
    if (cached?.answer) {
      events.push({
        event: 'done',
        data: {
          messageId: '',
          intent: cached.intent,
          confidenceScore: parseFloat(cached.confidenceScore || '0.9'),
          retrievalSources: JSON.parse(cached.retrievalSources || '[]'),
          tokensUsed: parseInt(cached.tokensUsed || '0'),
          fullContent: cached.answer,
        },
      });
      return events;
    }

    // 3. 搜索中提示
    events.push({ event: 'searching', data: { phase: 'rag_retrieval', sourcesFound: 0 } });

    // 4. 通过熔断器调用Dify
    try {
      const result = await this.circuitBreaker.call(
        () =>
          this.difyService.chatBlocking({
            query,
            user: visitorId,
            inputs: {
              context: JSON.stringify(context.slidingWindow.slice(-5)),
              intent: intent.intent,
            },
            response_mode: 'blocking',
          }),
        async () => ({
          answer: '抱歉，AI客服暂时不可用，请稍后重试或联系人工客服。',
          conversation_id: '',
          message_id: '',
          created_at: Date.now(),
          metadata: {} as any,
        } as any),
      );

      events.push({
        event: 'done',
        data: {
          messageId: result.message_id,
          intent: intent.intent,
          confidenceScore: intent.confidence,
          retrievalSources: result.metadata?.retriever_resources || [],
          tokensUsed: result.metadata?.usage?.total_tokens || 0,
          fullContent: result.answer,
        },
      });

      // 缓存结果
      await this.redis.hmset(`rag:answer:${questionHash}`, {
        question: query,
        answer: result.answer,
        intent: intent.intent,
        confidenceScore: String(intent.confidence),
        retrievalSources: JSON.stringify(result.metadata?.retriever_resources || []),
        tokensUsed: String(result.metadata?.usage?.total_tokens || 0),
        hitCount: '1',
        createdAt: new Date().toISOString(),
        lastHitAt: new Date().toISOString(),
      });
      await this.redis.expire(`rag:answer:${questionHash}`, 86400);

      // 更新热问排行
      await this.redis.zincrby(
        `stats:hot:daily:${new Date().toISOString().slice(0, 10)}`,
        1,
        query.slice(0, 100),
      );

      return events;
    } catch (error) {
      events.push({
        event: 'error',
        data: { type: 'error', code: 50201, message: `AI服务异常: ${error.message}` },
      });
      return events;
    }
  }

  async testQuery(query: string, config?: Record<string, unknown>) {
    const intent = await this.intentResolver.resolve(query);
    const result = await this.difyService.chatBlocking({
      query,
      user: 'admin-test',
      inputs: config || {},
      response_mode: 'blocking',
    });

    return {
      query,
      intent,
      answer: result.answer,
      tokensUsed: result.metadata?.usage?.total_tokens,
      retrievalSources: result.metadata?.retriever_resources,
    };
  }

  async getConfig() {
    return this.prisma.systemConfig.findMany({
      where: {
        configKey: { startsWith: 'agent.' },
      },
    });
  }

  async updateConfig(config: Record<string, unknown>) {
    for (const [key, value] of Object.entries(config)) {
      await this.prisma.systemConfig.upsert({
        where: { configKey: key },
        update: { configValue: value as any },
        create: { configKey: key, configValue: value as any },
      });
      await this.redis.set(`config:${key}`, JSON.stringify(value), 3600);
    }
    return { updated: true };
  }

  private hashQuestion(question: string): string {
    return createHash('md5')
      .update(question.trim().replace(/\s+/g, '').toLowerCase())
      .digest('hex')
      .slice(0, 16);
  }
}
