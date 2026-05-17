import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { EmbeddingService } from '../../../infrastructure/embedding/embedding.service';
import { MilvusService } from '../../../infrastructure/milvus/milvus.service';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface RetrievalResult {
  chunkId: string;
  documentTitle: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
}

@Injectable()
export class KnowledgeRetrieverService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly milvusService: MilvusService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async retrieve(query: string, topK: number = 5, threshold: number = 0.7): Promise<RetrievalResult[]> {
    // 检查缓存
    const cacheKey = `rag:chunk:${this.hashQuery(query)}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // 向量化查询
    const queryEmbedding = await this.embeddingService.embed(query);

    // Milvus ANN检索
    const searchResults = await this.milvusService.search(queryEmbedding, topK * 2);

    // 获取chunks详情
    const results: RetrievalResult[] = [];
    if (searchResults.results) {
      for (const result of searchResults.results) {
        if (result.score && result.score < threshold) continue;

        const chunkId = result.chunk_id;
        const docId = result.doc_id;

        const chunk = await this.prisma.knowledgeChunk.findUnique({
          where: { id: chunkId },
          include: { document: { select: { title: true } } },
        });

        if (chunk) {
          results.push({
            chunkId: chunk.id,
            documentTitle: chunk.document.title,
            documentId: docId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content.slice(0, 500),
            score: result.score || 0,
          });
        }
      }
    }

    // 排序+截断
    const sorted = results.sort((a, b) => b.score - a.score).slice(0, topK);

    // 缓存结果
    await this.redisService.set(cacheKey, JSON.stringify(sorted), 86400);

    return sorted;
  }

  private hashQuery(query: string): string {
    return createHash('md5').update(query.trim().toLowerCase()).digest('hex').slice(0, 12);
  }
}
