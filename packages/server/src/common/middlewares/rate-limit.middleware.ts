import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const identifier = (req as any).sessionToken || req.ip || 'unknown';
    const endpoint = req.path;
    const key = `rate:${identifier}:${endpoint}`;

    const now = Date.now();
    const windowMs = 60000; // 60s
    const maxRequests = this.getMaxRequests(req.path);

    try {
      const client = this.redisService.getClient();
      const member = `${now}:${Math.random()}`;

      const pipeline = client.pipeline();
      pipeline.zadd(key, now, member);
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

      const results = await pipeline.exec();
      const requestCount = results?.[2]?.[1] as number;

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - (requestCount || 0)));

      if (requestCount && requestCount > maxRequests) {
        throw new HttpException(
          { code: 42901, message: '请求过于频繁，请稍后重试' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      next(); // Redis 不可用时降级放行
    }
  }

  private getMaxRequests(path: string): number {
    if (path.includes('/auth/session')) return 10;
    if (path.includes('/messages')) return 20;
    if (path.includes('/stream')) return 1;
    if (path.includes('/login')) return 5;
    if (path.includes('/admin')) return 60;
    return 60;
  }
}
