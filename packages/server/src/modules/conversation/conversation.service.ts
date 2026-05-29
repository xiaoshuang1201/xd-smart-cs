import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async resolveVisitorId(token: string): Promise<string> {
    const session = await this.redis.hgetall(`session:token:${token}`);
    if (!session?.visitorId) {
      throw new NotFoundException('会话已过期或不存在');
    }
    return session.visitorId;
  }

  async getVisitorConversations(token: string, page: number, pageSize: number) {
    const visitorId = await this.resolveVisitorId(token);

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { visitorId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.conversation.count({ where: { visitorId } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getVisitorMessages(token: string, id: string, page: number, pageSize: number) {
    await this.verifyOwnership(id, token);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return messages;
  }

  // 管理后台: 对话列表
  async listConversations(params: { page: number; pageSize: number; status?: string; keyword?: string }) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.keyword) {
      where.OR = [
        { id: { contains: params.keyword, mode: 'insensitive' } },
        { sourcePage: { contains: params.keyword, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { visitor: { select: { id: true, fingerprint: true } } },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize, totalPages: Math.ceil(total / params.pageSize) };
  }

  async getConversationDetail(id: string, page: number, pageSize: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        visitor: { select: { id: true, fingerprint: true, ipAddress: true, firstSeenAt: true, visitCount: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        },
        workOrder: true,
      },
    });

    if (!conversation) throw new NotFoundException('会话不存在');
    return conversation;
  }

  private async verifyOwnership(id: string, token: string): Promise<void> {
    const visitorId = await this.resolveVisitorId(token);
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, select: { visitorId: true } });
    if (!conversation) throw new NotFoundException('会话不存在');
    if (conversation.visitorId !== visitorId) throw new ForbiddenException('无权操作该会话');
  }

  async closeConversation(id: string, token: string) {
    await this.verifyOwnership(id, token);

    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('会话不存在');
    if (conversation.status === 'closed') {
      throw new ConflictException('会话已关闭');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { status: 'closed', closedAt: new Date() },
    });
  }

  async transferToHuman(
    id: string,
    token: string,
    body: { reason?: string; contact?: string; contactType?: string },
  ) {
    await this.verifyOwnership(id, token);
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('会话不存在');

    const workOrder = await this.prisma.workOrder.create({
      data: {
        conversationId: id,
        title: `转人工 - ${body.reason || '用户请求'}`,
        description: `用户请求转人工客服\n原因: ${body.reason || '未指定'}\n联系方式: ${body.contact || '未提供'}\n联系方式类型: ${body.contactType || '未指定'}`,
        customerContact: body.contact,
        status: 'pending',
        priority: 'medium',
      },
    });

    await this.prisma.conversation.update({
      where: { id },
      data: {
        status: 'transferred',
        transferredAt: new Date(),
        transferredReason: body.reason,
      },
    });

    return {
      workOrderId: workOrder.id,
      message: '已为您创建工单，我们的技术专家将在工作时间内尽快联系您。',
      estimatedResponseTime: '2小时内',
    };
  }
}
