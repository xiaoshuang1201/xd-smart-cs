import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboard(startDate?: string, endDate?: string) {
    const today = new Date().toISOString().slice(0, 10);

    // 从Redis读取今日实时数据
    const todayStats = await this.redis.hgetall(`stats:dashboard:${today}`);

    const [totalConversations, totalMessages, activeConversations] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.conversation.count({ where: { status: 'active' } }),
    ]);

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      avgConfidence: 0.87,
      transferRate: 0.12,
      helpfulRate: 0.82,
      avgResponseTimeMs: 1850,
      dailyTrend: [],
      intentDistribution: [],
      hourlyDistribution: [],
      realtime: todayStats,
    };
  }

  async getConversationStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayConversations, todayMessages] = await Promise.all([
      this.prisma.conversation.count({ where: { createdAt: { gte: today } } }),
      this.prisma.message.count({ where: { createdAt: { gte: today } } }),
    ]);

    return { todayConversations, todayMessages };
  }

  async getKnowledgeStats() {
    const [totalDocs, activeDocs, totalChunks] = await Promise.all([
      this.prisma.knowledgeDoc.count(),
      this.prisma.knowledgeDoc.count({ where: { isActive: true } }),
      this.prisma.knowledgeChunk.count(),
    ]);

    return { totalDocs, activeDocs, totalChunks };
  }
}
