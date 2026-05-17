import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from '../../minio/minio.service';
import { EmbeddingService } from '../../embedding/embedding.service';
import { MilvusService } from '../../milvus/milvus.service';

@Processor('document-process')
export class KnowledgeQueueProcessor {
  private readonly logger = new Logger(KnowledgeQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly embedding: EmbeddingService,
    private readonly milvus: MilvusService,
  ) {}

  @Process('parse-and-index')
  async handleParseAndIndex(job: Job<{ documentId: string }>) {
    const { documentId } = job.data;
    this.logger.log(`Starting document processing: ${documentId}`);

    try {
      const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id: documentId } });
      if (!doc) {
        throw new Error(`Document not found: ${documentId}`);
      }

      await job.progress(10);

      // Step 1: Download & parse document
      const fileBuffer = await this.minio.getFile(doc.filePath);
      const parser = await this.getParserForType(doc.fileType);
      const text = await parser(fileBuffer);
      await job.progress(30);

      // Step 2: Split into chunks
      const chunks = this.splitChunks(text);
      await job.progress(50);

      // Step 3: Embed & insert to Milvus
      let totalTokens = 0;
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.embedding.embed(chunks[i]);
        const vectorId = await this.milvus.insert(
          `${documentId}_${i}`,
          documentId,
          embedding,
        );

        await this.prisma.knowledgeChunk.create({
          data: {
            documentId,
            chunkIndex: i,
            content: chunks[i],
            tokenCount: this.estimateTokenCount(chunks[i]),
            vectorId,
          },
        });

        totalTokens += this.estimateTokenCount(chunks[i]);
        await job.progress(50 + Math.floor((40 * (i + 1)) / chunks.length));
      }

      // Step 4: Update document status
      await this.prisma.knowledgeDoc.update({
        where: { id: documentId },
        data: {
          status: 'active',
          isActive: true,
          chunkCount: chunks.length,
          totalTokens,
          processedAt: new Date(),
        },
      });

      await job.progress(100);
      this.logger.log(`Document processed successfully: ${documentId} (${chunks.length} chunks)`);
    } catch (error) {
      this.logger.error(`Document processing failed: ${documentId} - ${error.message}`);
      await this.prisma.knowledgeDoc.update({
        where: { id: documentId },
        data: { status: 'error', errorMessage: error.message },
      });
      throw error;
    }
  }

  private splitChunks(text: string, chunkSize = 512, overlap = 64): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[。！？.!?\n])/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        const overlapStart = Math.max(0, currentChunk.length - overlap);
        currentChunk = currentChunk.slice(overlapStart) + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length >= 50); // Minimum chunk size
  }

  private async getParserForType(fileType: string): Promise<(buf: Buffer) => Promise<string>> {
    switch (fileType.toLowerCase()) {
      case 'txt':
      case 'md':
        return (buf) => Promise.resolve(buf.toString('utf-8'));
      case 'pdf':
        try {
          const pdfParse = require('pdf-parse');
          return (buf) => pdfParse(buf).then((r: any) => r.text);
        } catch {
          return (buf) => Promise.resolve(buf.toString('utf-8'));
        }
      case 'docx':
        try {
          const mammoth = require('mammoth');
          return (buf) =>
            mammoth.extractRawText({ buffer: buf }).then((r: any) => r.value);
        } catch {
          return (buf) => Promise.resolve(buf.toString('utf-8'));
        }
      case 'xlsx':
      case 'csv':
        return (buf) => Promise.resolve(buf.toString('utf-8'));
      default:
        return (buf) => Promise.resolve(buf.toString('utf-8'));
    }
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: Chinese ~1 char/token, English ~4 chars/token
    const chineseChars = (text.match(/[一-鿿]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars + otherChars / 4);
  }
}
