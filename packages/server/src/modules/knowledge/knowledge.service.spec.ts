import { Test, TestingModule } from '@nestjs/testing'
import { KnowledgeService } from './knowledge.service'
import { NotFoundException } from '@nestjs/common'

describe('KnowledgeService', () => {
  let service: KnowledgeService
  let mockPrisma: any
  let mockMinio: any
  let mockQueue: any

  beforeEach(async () => {
    mockPrisma = {
      knowledgeDoc: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    }
    mockMinio = {
      uploadFile: jest.fn().mockResolvedValue('bucket/test.pdf'),
      deleteFile: jest.fn(),
    }
    mockQueue = {
      addDocumentJob: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: 'MinioService', useValue: mockMinio },
        { provide: 'QueueService', useValue: mockQueue },
      ],
    }).compile()

    service = module.get<KnowledgeService>(KnowledgeService)
  })

  describe('uploadDocument', () => {
    it('should upload file and trigger async processing', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('fake-content'),
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File

      mockPrisma.knowledgeDoc.create.mockResolvedValue({
        id: 'doc1',
        status: 'processing',
      })

      const result = await service.uploadDocument(mockFile, 'Test Doc', 'description')

      expect(result.status).toBe('processing')
      expect(mockMinio.uploadFile).toHaveBeenCalled()
      expect(mockQueue.addDocumentJob).toHaveBeenCalledWith({ documentId: 'doc1' })
    })
  })

  describe('listDocuments', () => {
    it('should return paginated documents', async () => {
      mockPrisma.knowledgeDoc.findMany.mockResolvedValue([
        { id: 'doc1', title: 'Test', status: 'active', chunkCount: 5 },
      ])
      mockPrisma.knowledgeDoc.count.mockResolvedValue(1)

      const result = await service.listDocuments({ page: 1, pageSize: 20 })
      expect(result.items).toHaveLength(1)
    })
  })

  describe('getDocument', () => {
    it('should return document with chunks', async () => {
      mockPrisma.knowledgeDoc.findUnique.mockResolvedValue({
        id: 'doc1',
        title: 'Test',
        chunks: [{ id: 'ch1', content: 'chunk content' }],
      })

      const result = await service.getDocument('doc1')
      expect(result.title).toBe('Test')
      expect(result.chunks).toHaveLength(1)
    })

    it('should throw if document not found', async () => {
      mockPrisma.knowledgeDoc.findUnique.mockResolvedValue(null)
      await expect(service.getDocument('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('deleteDocument', () => {
    it('should soft delete and clean MinIO', async () => {
      mockPrisma.knowledgeDoc.findUnique.mockResolvedValue({
        id: 'doc1',
        filePath: 'bucket/test.pdf',
      })
      mockPrisma.knowledgeDoc.update.mockResolvedValue({ id: 'doc1', deletedAt: new Date() })

      await service.deleteDocument('doc1')
      expect(mockMinio.deleteFile).toHaveBeenCalledWith('bucket/test.pdf')
      expect(mockPrisma.knowledgeDoc.update).toHaveBeenCalled()
    })
  })

  describe('reprocessDocument', () => {
    it('should reset status and re-enqueue', async () => {
      mockPrisma.knowledgeDoc.findUnique.mockResolvedValue({
        id: 'doc1',
        status: 'error',
      })
      mockPrisma.knowledgeDoc.update.mockResolvedValue({ id: 'doc1', status: 'processing' })

      const result = await service.reprocessDocument('doc1')
      expect(result.status).toBe('processing')
      expect(mockQueue.addDocumentJob).toHaveBeenCalledWith({ documentId: 'doc1' })
    })
  })
})
