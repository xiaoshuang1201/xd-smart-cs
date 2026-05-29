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
    // 1. 验证会话身份
    const session = await this.redis.hgetall(`session:token:${sessionToken}`);
    if (!session || !session.conversationId) {
      throw new UnauthorizedException('会话已过期或无效');
    }

    const conversationId = dto.conversationId || session.conversationId;

    // 2. 存储用户消息
    const message = await this.messageService.createMessage({
      conversationId,
      role: 'user',
      content: dto.content,
    });

    // 3. 异步触发Agent响应
    this.processAgentResponse(conversationId, message.id, dto.content, session.visitorId)
      .catch((err) => this.logger.error(`Agent processing failed: ${err.message}`));

    return {
      messageId: message.id,
      conversationId,
      role: 'user',
      content: dto.content,
      createdAt: message.createdAt.toISOString(),
      sseStreamUrl: `/v1/conversations/${conversationId}/stream`,
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

  private async processAgentResponse(
    conversationId: string,
    userMessageId: string,
    query: string,
    visitorId: string,
  ) {
    try {
      this.logger.log(`[Gateway] Agent start — convId=${conversationId} query="${query.slice(0, 50)}"`);

      // 获取对话上下文
      const context = await this.contextManager.getContext(conversationId);
      this.logger.log(`[Gateway] Context loaded — messages=${context.slidingWindow.length}`);

      // 调用Agent生成回复
      const events = await this.agentService.generateResponse(query, context, visitorId);
      this.logger.log(`[Gateway] Agent returned ${events.length} events`);

      // 等待 SSE 连接建立（前端可能在 Agent 处理期间还没连上来）
      let waited = 0;
      while (!this.sseManager.isConnected(conversationId) && waited < 3000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      this.logger.log(`[Gateway] SSE ready — waited=${waited}ms connected=${this.sseManager.isConnected(conversationId)}`);

      // 流式推送SSE事件
      for (const event of events) {
        const sent = this.sseManager.sendToConversation(conversationId, event.event, event.data);
        this.logger.log(`[Gateway] SSE event="${event.event}" sent=${sent}`);

        if (event.event === 'done') {
          // 持久化AI消息
          const doneData = event.data as any;
          await this.messageService.createMessage({
            conversationId,
            role: 'assistant',
            content: doneData.fullContent || doneData.content || '',
          });

          // 更新对话计数
          await this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
              messageCount: { increment: 2 },
              agentConfidence: doneData.confidenceScore,
            },
          });

          // 更新对话上下文
          await this.contextManager.updateContext(conversationId, {
            role: 'user',
            content: query,
          });
          await this.contextManager.updateContext(conversationId, {
            role: 'assistant',
            content: doneData.fullContent || '',
          });
        }
      }
    } catch (error) {
      this.logger.error(`[Gateway] Agent failed: ${error.message}`, error.stack);
      this.sseManager.sendToConversation(conversationId, 'error', {
        type: 'error',
        code: 50201,
        message: `AI服务异常: ${error.message}`,
      });
    }
  }
}
