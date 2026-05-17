import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.buildCacheKey(request);

    if (!cacheKey) return next.handle();

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return of(JSON.parse(cached));
    }

    return next.handle().pipe(
      tap(async (data) => {
        const ttl = this.getTTL(request);
        await this.redisService.set(cacheKey, JSON.stringify(data), ttl);
      }),
    );
  }

  private buildCacheKey(request: any): string | null {
    const method = request.method;
    if (method !== 'GET') return null;
    return `cache:http:${request.url}`;
  }

  private getTTL(request: any): number {
    return request.cacheTTL || 60;
  }
}
