import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { DifyService } from '../../infrastructure/dify/dify.service';
import { DeepSeekService } from '../../infrastructure/deepseek/deepseek.service';
import type { DeepSeekMessage } from '../../infrastructure/deepseek/deepseek.service';
import { IntentResolverService } from './intent-resolver.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import type { ConversationContext } from '../conversation/context-manager.service';

const SYSTEM_PROMPTS: Record<string, string> = {
  product_inquiry:
    '你是新鼎电炉科技的AI客服，专门回答电炉设备的产品参数、选型推荐等问题。请根据你的专业知识给出准确、详细的回答。如果不确定，请如实告知并建议联系人工客服。',
  price:
    '你是新鼎电炉科技的AI客服，用户正在询价。请友好回应，说明具体价格需根据配置和需求定制，建议用户留下联系方式或转人工客服获取正式报价。',
  after_sales:
    '你是新鼎电炉科技的AI客服，用户遇到了售后问题。请先了解故障现象，提供基础的排查建议。复杂问题建议转人工客服处理。',
  installation:
    '你是新鼎电炉科技的AI客服，用户咨询安装调试相关事宜。请提供通用的安装注意事项，具体方案建议联系技术支持团队。',
  transfer:
    '你是新鼎电炉科技的AI客服，用户希望转人工。请友好回应，告知用户人工客服的工作时间（工作日9:00-18:00），并提供联系方式。',
  chat:
    '你是新鼎电炉科技的AI客服助手，专门服务电炉行业客户。请友好、专业地回答用户问题。',
};

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly difyService: DifyService,
    private readonly deepseekService: DeepSeekService,
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

    // 4. 选择 AI 通路：Dify 可用则走 Dify，否则直调 DeepSeek
    const difyHealthy = await this.difyService.isHealthy();
    const result = await (difyHealthy
      ? this.callViaDify(query, visitorId, intent.intent)
      : this.callViaDeepSeek(query, context, intent.intent));

    events.push({
      event: 'done',
      data: {
        messageId: result.messageId,
        intent: intent.intent,
        confidenceScore: intent.confidence,
        retrievalSources: result.retrievalSources,
        tokensUsed: result.tokensUsed,
        fullContent: result.answer,
      },
    });

    // 缓存结果
    await this.redis.hmset(`rag:answer:${questionHash}`, {
      question: query,
      answer: result.answer,
      intent: intent.intent,
      confidenceScore: String(intent.confidence),
      retrievalSources: JSON.stringify(result.retrievalSources || []),
      tokensUsed: String(result.tokensUsed || 0),
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
  }

  private async callViaDify(query: string, visitorId: string, intent: string) {
    try {
      const result = await this.circuitBreaker.call(
        () =>
          this.difyService.chatBlocking({
            query,
            user: visitorId,
            inputs: { intent },
            response_mode: 'blocking',
          }),
        async () => {
          throw new Error('CIRCUIT_OPEN');
        },
      );

      return {
        answer: result.answer,
        messageId: result.message_id,
        tokensUsed: result.metadata?.usage?.total_tokens || 0,
        retrievalSources: result.metadata?.retriever_resources || [],
      };
    } catch (error) {
      this.logger.warn(`Dify unavailable, falling back to DeepSeek: ${error.message}`);
      return this.callViaDeepSeek(query, null, intent);
    }
  }

  private async callViaDeepSeek(
    query: string,
    context: ConversationContext | null,
    intent: string,
  ) {
    const systemPrompt = SYSTEM_PROMPTS[intent] || SYSTEM_PROMPTS.chat;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (context?.slidingWindow?.length) {
      for (const msg of context.slidingWindow.slice(-6)) {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }

    messages.push({ role: 'user', content: query });

    const result = await this.deepseekService.chat(messages);

    return {
      answer: result.answer,
      messageId: result.messageId,
      tokensUsed: result.tokensUsed,
      retrievalSources: [] as Array<Record<string, unknown>>,
    };
  }

  async testQuery(query: string, config?: Record<string, unknown>) {
    const intent = await this.intentResolver.resolve(query);
    const difyHealthy = await this.difyService.isHealthy();

    if (difyHealthy) {
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
        backend: 'dify' as const,
      };
    }

    // Fallback to DeepSeek
    const systemPrompt = SYSTEM_PROMPTS[intent.intent] || SYSTEM_PROMPTS.chat;
    const result = await this.deepseekService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ]);
    return {
      query,
      intent,
      answer: result.answer,
      tokensUsed: result.tokensUsed,
      retrievalSources: [],
      backend: 'deepseek' as const,
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
