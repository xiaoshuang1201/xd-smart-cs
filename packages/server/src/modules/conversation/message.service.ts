import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(data: {
    conversationId: string;
    role: string;
    content: string;
    intent?: string;
    confidenceScore?: number;
    tokensUsed?: number;
  }) {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        intent: data.intent,
        confidenceScore: data.confidenceScore,
        tokensUsed: data.tokensUsed,
      },
    });
  }

  async getMessages(conversationId: string, page = 1, pageSize = 50) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async getMessageById(id: string) {
    return this.prisma.message.findUnique({ where: { id } });
  }
}
