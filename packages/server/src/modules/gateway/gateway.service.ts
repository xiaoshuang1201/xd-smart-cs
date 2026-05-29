import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { SSEManagerService } from '../../infrastructure/sse/sse-manager.service';
import { ContextManagerService } from '../conversation/context-manager.service';
import { MessageService } from '../conversation/message.service';
import { AgentService } from '../agent/agent.service';
import type { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sseManager: SSEManagerService,
    private readonly contextManager: ContextManagerService,
    private readonly messageService: MessageService,
    private readonly agentService: AgentService,
  ) {}

  async handleIncomingMessage(sessionToken: string, dto: SendMessageDto) {
    const session = await this.redis.hgetall(`session:token:${sessionToken}`);
    if (!session || !session.conversationId) {
      throw new UnauthorizedException('会话已过期或无效');
    }

    const conversationId = dto.conversationId || session.conversationId;

    // 1. 存储用户消息
    const userMsg = await this.messageService.createMessage({
      conversationId,
      role: 'user',
      content: dto.content,
    });
    this.logger.log(`[Gateway] User message saved: ${userMsg.id}`);

    // 2. 获取上下文
    const context = await this.contextManager.getContext(conversationId);

    // 3. 调用 Agent 生成回复
    this.logger.log(`[Gateway] Calling agent for: "${dto.content.slice(0, 50)}"`);
    const events = await this.agentService.generateResponse(dto.content, context, session.visitorId);

    // 4. 提取 AI 回复内容
    let aiContent = '';
    for (const evt of events) {
      if (evt.event === 'done') {
        aiContent = (evt.data as any).fullContent || '';
        break;
      }
    }

    if (!aiContent) {
      this.logger.warn(`[Gateway] Agent returned no content`);
      aiContent = '抱歉，AI回复出了点问题，请稍后再试。';
    }

    // 5. 存储 AI 回复
    const aiMsg = await this.messageService.createMessage({
      conversationId,
      role: 'assistant',
      content: aiContent,
    });

    // 6. 更新对话
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 2 } },
    });
    await this.contextManager.updateContext(conversationId, { role: 'user', content: dto.content });
    await this.contextManager.updateContext(conversationId, { role: 'assistant', content: aiContent });

    // 7. 如果有活跃的 SSE 连接，推送事件
    if (this.sseManager.isConnected(conversationId)) {
      for (const evt of events) {
        this.sseManager.sendToConversation(conversationId, evt.event, evt.data);
      }
    }

    // 8. 同步返回完整结果
    const doneEvent = events.find((e) => e.event === 'done')?.data as any;
    return {
      messageId: userMsg.id,
      conversationId,
      role: 'user',
      content: dto.content,
      createdAt: userMsg.createdAt.toISOString(),
      reply: {
        messageId: aiMsg.id,
        conversationId,
        role: 'assistant',
        content: aiContent,
        createdAt: aiMsg.createdAt.toISOString(),
        intent: doneEvent?.intent || 'chat',
        confidenceScore: doneEvent?.confidenceScore || 0,
        retrievalSources: doneEvent?.retrievalSources || [],
        tokensUsed: doneEvent?.tokensUsed || 0,
      },
    };
  }

  async handleSSEConnection(
    sessionToken: string,
    conversationId: string,
    res: Response,
  ) {
    const session = await this.redis.hgetall(`session:token:${sessionToken}`);
    if (!session || session.conversationId !== conversationId) {
      res.write(`event: error\ndata: ${JSON.stringify({ code: 40101, message: '未授权' })}\n\n`);
      res.end();
      return;
    }

    this.sseManager.register(conversationId, res);
  }
}
