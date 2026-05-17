import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import type { EmbeddingResponse } from './embedding.types';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxBatchSize = 32;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.baseUrl = this.configService.get('BGE_EMBEDDING_URL', 'http://localhost:8000');
    this.model = this.configService.get('BGE_EMBEDDING_MODEL', 'BAAI/bge-large-zh-v1.5');
  }

  async embed(text: string): Promise<number[]> {
    const cacheKey = `embed:${this.hashText(text)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const embedding = await this.callEmbedding([text]);
    const vector = embedding.embeddings[0];

    await this.redisService.set(cacheKey, JSON.stringify(vector), 86400); // 24h TTL
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const toCompute: string[] = [];
    const indices: number[] = [];

    // 检查缓存
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = `embed:${this.hashText(texts[i])}`;
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        results[i] = JSON.parse(cached);
      } else {
        toCompute.push(texts[i]);
        indices.push(i);
      }
    }

    if (toCompute.length === 0) return results;

    // 分批调用
    for (let i = 0; i < toCompute.length; i += this.maxBatchSize) {
      const batch = toCompute.slice(i, i + this.maxBatchSize);
      const response = await this.callEmbedding(batch);

      for (let j = 0; j < batch.length; j++) {
        const idx = indices[i + j];
        results[idx] = response.embeddings[j];
        const cacheKey = `embed:${this.hashText(batch[j])}`;
        await this.redisService.set(cacheKey, JSON.stringify(response.embeddings[j]), 86400);
      }
    }

    return results;
  }

  private async callEmbedding(texts: string[]): Promise<EmbeddingResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.post<EmbeddingResponse>(
          `${this.baseUrl}/embed`,
          { inputs: texts, model: this.model },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Embedding call failed: ${error}`);
      throw error;
    }
  }

  private hashText(text: string): string {
    return createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 16);
  }
}
