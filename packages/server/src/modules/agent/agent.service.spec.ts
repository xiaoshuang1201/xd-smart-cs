import { Test, TestingModule } from '@nestjs/testing'
import { AgentService } from './agent.service'

describe('AgentService', () => {
  let service: AgentService
  let mockPrisma: any
  let mockRedis: any
  let mockDify: any
  let mockIntent: any
  let mockCircuit: any

  beforeEach(async () => {
    mockPrisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
    }
    mockRedis = {
      hgetall: jest.fn().mockResolvedValue({}),
      hmset: jest.fn(),
      expire: jest.fn(),
      zincrby: jest.fn(),
      set: jest.fn(),
    }
    mockDify = { chatBlocking: jest.fn() }
    mockIntent = { resolve: jest.fn().mockResolvedValue({ intent: 'product_inquiry', confidence: 0.85 }) }
    mockCircuit = { call: jest.fn().mockImplementation((fn: Function) => fn()) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: 'RedisService', useValue: mockRedis },
        { provide: 'DifyService', useValue: mockDify },
        { provide: 'IntentResolverService', useValue: mockIntent },
        { provide: 'CircuitBreakerService', useValue: mockCircuit },
      ],
    }).compile()

    service = module.get<AgentService>(AgentService)
  })

  describe('generateResponse', () => {
    it('should return cached answer if available', async () => {
      mockRedis.hgetall.mockResolvedValue({
        answer: '缓存答案',
        intent: 'product_inquiry',
        confidenceScore: '0.9',
        retrievalSources: '[]',
        tokensUsed: '50',
      })

      const events = await service.generateResponse('test query', {
        conversationId: 'c1',
        summary: '',
        slidingWindow: [],
        extractedSlots: {},
        intentHistory: [],
        totalTokensUsed: 0,
      }, 'v1')

      expect(events).toHaveLength(2) // thinking + done
      expect(events[1].data).toHaveProperty('fullContent', '缓存答案')
    })

    it('should call Dify when cache miss', async () => {
      mockDify.chatBlocking.mockResolvedValue({
        answer: 'AI生成答案',
        conversation_id: '',
        message_id: 'm1',
        metadata: { retriever_resources: [], usage: { total_tokens: 100 } },
      })

      const events = await service.generateResponse('new query', {
        conversationId: 'c1',
        summary: '',
        slidingWindow: [],
        extractedSlots: {},
        intentHistory: [],
        totalTokensUsed: 0,
      }, 'v1')

      expect(events).toHaveLength(3) // thinking + searching + done
      expect(mockDify.chatBlocking).toHaveBeenCalled()
      expect(mockRedis.hmset).toHaveBeenCalled() // Cache writes
    })

    it('should handle Dify error gracefully', async () => {
      mockCircuit.call.mockRejectedValue(new Error('Dify timeout'))

      const events = await service.generateResponse('query', {
        conversationId: 'c1',
        summary: '',
        slidingWindow: [],
        extractedSlots: {},
        intentHistory: [],
        totalTokensUsed: 0,
      }, 'v1')

      expect(events[events.length - 1].event).toBe('error')
    })
  })

  describe('getConfig/updateConfig', () => {
    it('should get agent configs', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { configKey: 'agent.greeting_message', configValue: { val: 'hello' } },
      ])
      const result = await service.getConfig()
      expect(result).toHaveLength(1)
    })

    it('should update configs', async () => {
      const result = await service.updateConfig({ 'agent.test': 'val' })
      expect(result.updated).toBe(true)
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalled()
    })
  })
})
