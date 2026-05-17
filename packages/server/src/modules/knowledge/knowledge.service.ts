import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MinioService } from '../../infrastructure/minio/minio.service';
import { QueueService } from '../../infrastructure/queue/queue.service';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly queue: QueueService,
  ) {}

  async uploadDocument(file: Express.Multer.File, title: string, description?: string) {
    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = await this.minio.uploadFile(fileName, file.buffer, file.mimetype);

    const doc = await this.prisma.knowledgeDoc.create({
      data: {
        title: title || file.originalname,
        description,
        fileType: file.originalname.split('.').pop()?.toLowerCase() || 'unknown',
        filePath,
        fileSize: file.size,
        status: 'processing',
      },
    });

    // 触发异步文档处理
    await this.queue.addDocumentJob({ documentId: doc.id });

    return {
      id: doc.id,
      status: 'processing',
      message: '文档上传成功，正在解析处理中...',
    };
  }

  async listDocuments(params: { page: number; pageSize: number; status?: string; keyword?: string }) {
    const where: Record<string, unknown> = {};
    if (params.status) where.status = params.status;
    if (params.keyword) where.title = { contains: params.keyword };

    const [items, total] = await Promise.all([
      this.prisma.knowledgeDoc.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { uploadedBy: { select: { id: true, displayName: true } } },
      }),
      this.prisma.knowledgeDoc.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  async getDocument(id: string) {
    const doc = await this.prisma.knowledgeDoc.findUnique({
      where: { id },
      include: { chunks: { take: 20, orderBy: { chunkIndex: 'asc' } } },
    });
    if (!doc) throw new NotFoundException('文档不存在');
    return doc;
  }

  async updateDocument(id: string, data: Record<string, unknown>) {
    return this.prisma.knowledgeDoc.update({ where: { id }, data });
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');

    // 清理MinIO文件
    await this.minio.deleteFile(doc.filePath);

    // 清理向量数据
    // await this.milvus.deleteByDocId(id);

    return this.prisma.knowledgeDoc.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, status: 'archived' },
    });
  }

  async reprocessDocument(id: string) {
    const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文档不存在');

    await this.prisma.knowledgeDoc.update({
      where: { id },
      data: { status: 'processing', errorMessage: null },
    });

    await this.queue.addDocumentJob({ documentId: id });
    return { status: 'processing' };
  }
}
