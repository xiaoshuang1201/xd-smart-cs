import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAllConfigs() {
    return this.prisma.systemConfig.findMany();
  }

  async updateConfig(key: string, value: unknown) {
    const updated = await this.prisma.systemConfig.upsert({
      where: { configKey: key },
      update: { configValue: value as any },
      create: { configKey: key, configValue: value as any },
    });

    await this.redis.set(`config:${key}`, JSON.stringify(value), 3600);
    return updated;
  }

  async clearCache(type?: string) {
    if (!type || type === 'rag') {
      await this.deleteKeysByPattern('rag:answer:*');
    }
    if (!type || type === 'config') {
      await this.deleteKeysByPattern('config:*');
    }
    return { cleared: true, type: type || 'all' };
  }

  private async deleteKeysByPattern(pattern: string): Promise<void> {
    const client = this.redis.getClient();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async getUsers() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async createUser(data: Record<string, unknown>) {
    const passwordHash = await bcrypt.hash((data.password as string) || 'default123', 12);

    return this.prisma.adminUser.create({
      data: {
        username: data.username as string,
        email: data.email as string,
        passwordHash,
        displayName: (data.displayName as string) || (data.username as string),
        role: (data.role as any) || 'customer_service',
      },
      select: { id: true, username: true, displayName: true, role: true },
    });
  }
}
