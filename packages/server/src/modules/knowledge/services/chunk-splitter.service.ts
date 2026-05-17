import { Injectable } from '@nestjs/common';

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ChunkSplitterService {
  private readonly chunkSize = 512;
  private readonly overlap = 64;

  split(text: string): Chunk[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const paraTokens = this.estimateTokens(para);

      if (this.estimateTokens(currentChunk) + paraTokens > this.chunkSize) {
        if (currentChunk.trim()) {
          chunks.push({
            index: chunkIndex++,
            content: currentChunk.trim(),
            tokenCount: this.estimateTokens(currentChunk),
            metadata: {},
          });

          // Overlap: 保留上一块的末尾内容
          const overlapText = this.getOverlapText(currentChunk);
          currentChunk = overlapText + para + '\n\n';
        } else {
          currentChunk = para + '\n\n';
        }
      } else {
        currentChunk += para + '\n\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        index: chunkIndex,
        content: currentChunk.trim(),
        tokenCount: this.estimateTokens(currentChunk),
        metadata: {},
      });
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length * 0.4);
  }

  private getOverlapText(chunk: string): string {
    const sentences = chunk.split(/[。！？\n]/);
    let overlap = '';
    let count = 0;

    for (let i = sentences.length - 1; i >= 0 && count < this.overlap; i--) {
      overlap = sentences[i] + '。' + overlap;
      count += this.estimateTokens(sentences[i]);
    }

    return overlap;
  }
}
