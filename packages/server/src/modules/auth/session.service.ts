import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import type { CreateSessionDto } from './dto';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createSession(dto: CreateSessionDto) {
    const fingerprint = dto.fingerprint || uuidv4();

    // 查找或创建访客
    let visitor = await this.prisma.visitor.findUnique({
      where: { fingerprint },
    });

    if (visitor) {
      visitor = await this.prisma.visitor.update({
        where: { id: visitor.id },
        data: { lastSeenAt: new Date(), visitCount: { increment: 1 } },
      });
    } else {
      visitor = await this.prisma.visitor.create({
        data: { fingerprint },
      });
    }

    // 创建会话
    const sessionToken = `sess_${uuidv4()}`;
    const csrfToken = `csrf_${uuidv4()}`;

    const conversation = await this.prisma.conversation.create({
      data: {
        visitorId: visitor.id,
        sessionToken,
        sourcePage: dto.sourcePage,
        sourceContext: (dto.sourceContext || {}) as any,
      },
    });

    // 写入 Redis
    const sessionData = {
      visitorId: visitor.id,
      conversationId: conversation.id,
      fingerprint,
      createdAt: new Date().toISOString(),
    };

    await this.redis.hmset(`session:token:${sessionToken}`, sessionData);
    await this.redis.expire(`session:token:${sessionToken}`, 86400); // 24h
    await this.redis.set(`session:csrf:${csrfToken}`, sessionToken, 86400);

    // 访客指纹缓存
    await this.redis.set(`visitor:fingerprint:${fingerprint}`, visitor.id, 604800); // 7d

    const greeting = '您好！我是新鼎电炉智能客服，请问有什么可以帮您？';
    const suggestedQuestions = this.getSuggestedQuestions(dto.sourceContext);

    return {
      sessionToken,
      csrfToken,
      conversationId: conversation.id,
      greeting,
      suggestedQuestions,
    };
  }

  async verifySession(token: string) {
    const session = await this.redis.hgetall(`session:token:${token}`);
    if (!session?.visitorId) {
      return { valid: false };
    }
    const ttl = await this.redis.ttl(`session:token:${token}`);
    return {
      valid: true,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  private getSuggestedQuestions(context?: Record<string, unknown>): string[] {
    const pageType = context?.pageType as string;
    if (pageType === 'product_detail') {
      return ['这个产品的功率范围是多少？', '可以给我报个价吗？', '节电率大概有多高？'];
    }
    return ['IGBT中频炉有什么优势？', '如何选型？', '价格区间是多少？'];
  }
}
