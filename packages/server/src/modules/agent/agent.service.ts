import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { DeepSeekService } from '../../infrastructure/deepseek/deepseek.service';
import type { DeepSeekMessage } from '../../infrastructure/deepseek/deepseek.service';
import { IntentResolverService } from './intent-resolver.service';
import { FAQ_DATASET, matchFAQ } from './faq.data';
import type { ConversationContext } from '../conversation/context-manager.service';

const SYSTEM_PROMPT = `你是新鼎电炉科技的AI客服助手。公司主营IGBT中频感应熔炼炉、加热炉、热处理炉等电炉设备。

请遵守以下规则：
1. 用中文回答，专业、准确、友好
2. 如果问题超出你的知识范围，诚实地告知用户，并建议联系人工客服
3. 不要编造技术参数，不确定的就说需要和技术团队确认
4. 遇到询价时，说明价格需根据配置定制，建议留联系方式
5. 遇到报修/故障，先了解情况，给出基础排查建议，严重的建议联系售后`;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly deepseekService: DeepSeekService,
    private readonly intentResolver: IntentResolverService,
  ) {}

  async generateResponse(
    query: string,
    context: ConversationContext,
    visitorId: string,
  ): Promise<Array<{ event: string; data: unknown }>> {
    const events: Array<{ event: string; data: unknown }> = [];
    const startTime = Date.now();

    // 1. 意图识别
    const intent = await this.intentResolver.resolve(query);
    this.logger.log(`[Agent] query="${query.slice(0, 50)}" intent=${intent.intent} confidence=${intent.confidence}`);
    events.push({
      event: 'thinking',
      data: { phase: 'intent_recognition', intent: intent.intent, confidence: intent.confidence },
    });

    // 2. 检查缓存
    const questionHash = this.hashQuestion(query);
    const cached = await this.redis.hgetall(`rag:answer:${questionHash}`);
    if (cached?.answer) {
      this.logger.log(`[Agent] Cache HIT for "${query.slice(0, 30)}"`);
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

    // 3. FAQ 问答集匹配
    const faqMatch = matchFAQ(query);
    if (faqMatch) {
      this.logger.log(`[Agent] FAQ MATCH: "${faqMatch.question}" (score from keywords)`);
      const answer = faqMatch.answer;
      events.push({
        event: 'done',
        data: {
          messageId: `faq_${Date.now()}`,
          intent: faqMatch.intent,
          confidenceScore: 0.95,
          retrievalSources: [{ source: 'FAQ', question: faqMatch.question }],
          tokensUsed: 0,
          fullContent: answer,
        },
      });
      await this.cacheAnswer(questionHash, query, answer, faqMatch.intent, 0.95, '[]', '0');
      return events;
    }

    // 4. 调用 DeepSeek
    events.push({ event: 'searching', data: { phase: 'llm_query', sourcesFound: 0 } });
    this.logger.log(`[Agent] Calling DeepSeek for: "${query.slice(0, 50)}"`);

    try {
      const result = await this.callDeepSeek(query, context, intent.intent);

      const elapsed = Date.now() - startTime;
      this.logger.log(`[Agent] DeepSeek responded in ${elapsed}ms, tokens=${result.tokensUsed}`);

      events.push({
        event: 'done',
        data: {
          messageId: result.messageId,
          intent: intent.intent,
          confidenceScore: intent.confidence,
          retrievalSources: [] as Array<Record<string, unknown>>,
          tokensUsed: result.tokensUsed,
          fullContent: result.answer,
        },
      });

      await this.cacheAnswer(
        questionHash,
        query,
        result.answer,
        intent.intent,
        intent.confidence,
        '[]',
        String(result.tokensUsed),
      );

      return events;
    } catch (error) {
      this.logger.error(`[Agent] DeepSeek call failed: ${error.message}`);
      const fallbackMsg = '抱歉，AI服务暂时不可用，请稍后再试。如需紧急帮助，请拨打客服热线。';
      events.push({
        event: 'done',
        data: {
          messageId: `err_${Date.now()}`,
          intent: intent.intent,
          confidenceScore: 0,
          retrievalSources: [],
          tokensUsed: 0,
          fullContent: fallbackMsg,
        },
      });
      return events;
    }
  }

  private async callDeepSeek(
    query: string,
    context: ConversationContext | null,
    _intent: string,
  ) {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // 附加上下文中的对话历史（最近4轮）
    if (context?.slidingWindow?.length) {
      for (const msg of context.slidingWindow.slice(-8)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: query });

    const result = await this.deepseekService.chat(messages, {
      temperature: 0.7,
      maxTokens: 1024,
    });

    return {
      answer: result.answer,
      messageId: result.messageId,
      tokensUsed: result.tokensUsed,
    };
  }

  private async cacheAnswer(
    hash: string,
    question: string,
    answer: string,
    intent: string,
    confidence: number,
    sources: string,
    tokens: string,
  ) {
    try {
      await this.redis.hmset(`rag:answer:${hash}`, {
        question,
        answer,
        intent,
        confidenceScore: String(confidence),
        retrievalSources: sources,
        tokensUsed: tokens,
        hitCount: '1',
        createdAt: new Date().toISOString(),
        lastHitAt: new Date().toISOString(),
      });
      await this.redis.expire(`rag:answer:${hash}`, 86400);

      await this.redis.zincrby(
        `stats:hot:daily:${new Date().toISOString().slice(0, 10)}`,
        1,
        question.slice(0, 100),
      );
    } catch (err) {
      this.logger.warn(`Failed to cache answer: ${err.message}`);
    }
  }

  async testQuery(query: string) {
    const startTime = Date.now();
    const intent = await this.intentResolver.resolve(query);

    // FAQ match first
    const faqMatch = matchFAQ(query);
    if (faqMatch) {
      return {
        query,
        intent,
        answer: faqMatch.answer,
        tokensUsed: 0,
        source: 'faq' as const,
        elapsed: Date.now() - startTime,
      };
    }

    // DeepSeek
    const systemPrompt = SYSTEM_PROMPT;
    const result = await this.deepseekService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ]);

    return {
      query,
      intent,
      answer: result.answer,
      tokensUsed: result.tokensUsed,
      source: 'deepseek' as const,
      elapsed: Date.now() - startTime,
    };
  }

  async getConfig() {
    return this.prisma.systemConfig.findMany({
      where: { configKey: { startsWith: 'agent.' } },
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
