import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../../../infrastructure/embedding/embedding.service';
import { MilvusService } from '../../../infrastructure/milvus/milvus.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { Chunk } from './chunk-splitter.service';

@Injectable()
export class VectorIndexerService {
  private readonly logger = new Logger(VectorIndexerService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly milvusService: MilvusService,
    private readonly prisma: PrismaService,
  ) {}

  async indexChunks(documentId: string, chunks: Chunk[]): Promise<number> {
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingService.embedBatch(texts);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      // 写入Milvus
      const vectorId = await this.milvusService.insert(chunk.index.toString(), documentId, embedding);

      // 写入PostgreSQL
      await this.prisma.knowledgeChunk.create({
        data: {
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          vectorId: String(vectorId),
          metadata: (chunk.metadata || {}) as any,
        },
      });
    }

    this.logger.log(`Indexed ${chunks.length} chunks for document ${documentId}`);
    return chunks.length;
  }

  async deleteIndex(documentId: string): Promise<void> {
    await this.milvusService.deleteByDocId(documentId);
    this.logger.log(`Deleted vectors for document ${documentId}`);
  }
}
