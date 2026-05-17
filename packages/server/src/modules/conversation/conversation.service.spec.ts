import { Test, TestingModule } from '@nestjs/testing'
import { ConversationService } from './conversation.service'
import { NotFoundException, ForbiddenException } from '@nestjs/common'

describe('ConversationService', () => {
  let service: ConversationService
  let mockPrisma: any
  let mockRedis: any

  beforeEach(async () => {
    mockPrisma = {
      conversation: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      workOrder: { create: jest.fn() },
      message: { findMany: jest.fn() },
    }
    mockRedis = {
      hgetall: jest.fn(),
      hmset: jest.fn(),
      set: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: 'RedisService', useValue: mockRedis },
      ],
    }).compile()

    service = module.get<ConversationService>(ConversationService)
  })

  describe('getVisitorConversations', () => {
    it('should return conversations for valid session', async () => {
      mockRedis.hgetall.mockResolvedValue({ visitorId: 'v1', conversationId: 'c1' })
      mockPrisma.conversation.findMany.mockResolvedValue([{ id: 'c1', status: 'active' }])
      mockPrisma.conversation.count.mockResolvedValue(1)

      const result = await service.getVisitorConversations('valid-token', 1, 20)
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should throw if session expired', async () => {
      mockRedis.hgetall.mockResolvedValue({})
      await expect(service.getVisitorConversations('invalid', 1, 20)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('closeConversation', () => {
    it('should close conversation if owner matches', async () => {
      mockRedis.hgetall.mockResolvedValue({ visitorId: 'v1' })
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'c1', visitorId: 'v1' })
      mockPrisma.conversation.update.mockResolvedValue({
        id: 'c1',
        status: 'closed',
        closedAt: new Date(),
      })

      const result = await service.closeConversation('c1', 'valid-token')
      expect(result.status).toBe('closed')
    })

    it('should throw ForbiddenException if not owner', async () => {
      mockRedis.hgetall.mockResolvedValue({ visitorId: 'v2' })
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'c1', visitorId: 'v1' })

      await expect(service.closeConversation('c1', 'valid-token')).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('transferToHuman', () => {
    it('should create work order and update conversation status', async () => {
      mockRedis.hgetall.mockResolvedValue({ visitorId: 'v1' })
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'c1', visitorId: 'v1' })
      mockPrisma.workOrder.create.mockResolvedValue({ id: 'wo1' })
      mockPrisma.conversation.update.mockResolvedValue({ id: 'c1', status: 'transferred' })

      const result = await service.transferToHuman('c1', 'valid-token', {
        reason: '需要人工',
        contact: '13800138000',
        contactType: 'phone',
      })

      expect(result.workOrderId).toBe('wo1')
      expect(mockPrisma.workOrder.create).toHaveBeenCalled()
    })
  })
})
