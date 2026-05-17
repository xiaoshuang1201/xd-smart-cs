import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeRetrieverService } from './services/knowledge-retriever.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('管理后台 - 知识库')
@ApiBearerAuth()
@Roles('super_admin', 'knowledge_admin')
@Controller('admin/knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly retrieverService: KnowledgeRetrieverService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传知识文档' })
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description?: string,
  ) {
    return this.knowledgeService.uploadDocument(file, title, description);
  }

  @Get()
  @ApiOperation({ summary: '文档列表' })
  getDocuments(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.knowledgeService.listDocuments({ page: +page, pageSize: +pageSize, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '文档详情' })
  getDocument(@Param('id') id: string) {
    return this.knowledgeService.getDocument(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新文档配置' })
  updateDocument(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.knowledgeService.updateDocument(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档(软删除)' })
  deleteDocument(@Param('id') id: string) {
    return this.knowledgeService.deleteDocument(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: '重新处理文档' })
  reprocessDocument(@Param('id') id: string) {
    return this.knowledgeService.reprocessDocument(id);
  }

  @Post('search')
  @ApiOperation({ summary: '知识检索' })
  search(@Body() body: { query: string; topK?: number; threshold?: number }) {
    return this.retrieverService.retrieve(body.query, body.topK || 5, body.threshold || 0.7);
  }
}
