import { Module } from '@nestjs/common';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentParserService } from './services/document-parser.service';
import { ChunkSplitterService } from './services/chunk-splitter.service';
import { VectorIndexerService } from './services/vector-indexer.service';
import { KnowledgeRetrieverService } from './services/knowledge-retriever.service';

@Module({
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    DocumentParserService,
    ChunkSplitterService,
    VectorIndexerService,
    KnowledgeRetrieverService,
  ],
  exports: [KnowledgeService, KnowledgeRetrieverService],
})
export class KnowledgeModule {}
