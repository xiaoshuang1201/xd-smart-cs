import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

describe('AuthService', () => {
  let service: AuthService
  let mockPrisma: any
  let mockJwt: any
  let mockConfig: any

  beforeEach(async () => {
    mockPrisma = {
      adminUser: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    }
    mockJwt = { sign: jest.fn().mockReturnValue('test-jwt-token') }
    mockConfig = { get: jest.fn().mockReturnValue('test-value') }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'PrismaService', useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  describe('validateUser', () => {
    it('should return user without passwordHash on valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        passwordHash: '$2b$12$hashed',
        role: 'super_admin',
        status: 'active',
      }
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockUser)
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true)

      const result = await service.validateUser('admin', 'password')

      expect(result).toBeDefined()
      expect(result?.username).toBe('admin')
      expect((result as any)?.passwordHash).toBeUndefined()
    })

    it('should return null for invalid password', async () => {
      const mockUser = {
        id: '1',
        username: 'admin',
        passwordHash: '$2b$12$hashed',
        role: 'super_admin',
        status: 'active',
      }
      mockPrisma.adminUser.findUnique.mockResolvedValue(mockUser)
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false)

      const result = await service.validateUser('admin', 'wrong')
      expect(result).toBeNull()
    })

    it('should return null for non-existent user', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValue(null)
      const result = await service.validateUser('nobody', 'password')
      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    it('should return access token and user info', async () => {
      const user = {
        id: '1',
        username: 'admin',
        displayName: '管理员',
        role: 'super_admin',
        avatarUrl: null,
      }
      mockPrisma.refreshToken.create.mockResolvedValue({})
      mockPrisma.adminUser.update.mockResolvedValue({})

      const result = await service.login(user)

      expect(result.accessToken).toBe('test-jwt-token')
      expect(result.expiresIn).toBe(7200)
      expect(result.user.username).toBe('admin')
      expect(mockJwt.sign).toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('should create a new admin user', async () => {
      mockPrisma.adminUser.findFirst.mockResolvedValue(null)
      mockPrisma.adminUser.create.mockResolvedValue({
        id: '2',
        username: 'new_user',
        displayName: 'New',
        role: 'customer_service',
      })

      const result = await service.register({
        username: 'new_user',
        password: 'pass123',
        email: 'new@test.com',
        displayName: 'New',
      })

      expect(result.username).toBe('new_user')
      expect(result.role).toBe('customer_service')
    })

    it('should throw ConflictException for duplicate username', async () => {
      mockPrisma.adminUser.findFirst.mockResolvedValue({ id: '1' })

      await expect(
        service.register({
          username: 'admin',
          password: 'pass123',
          email: 'admin@test.com',
          displayName: 'Admin',
        }),
      ).rejects.toThrow()
    })
  })

  describe('refreshToken', () => {
    it('should return new access token for valid refresh token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        adminUserId: '1',
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      })
      mockPrisma.adminUser.findUnique.mockResolvedValue({
        id: '1',
        username: 'admin',
        role: 'super_admin',
        displayName: 'Admin',
        status: 'active',
      })

      const result = await service.refreshToken('valid-token')
      expect(result.accessToken).toBeTruthy()
    })

    it('should throw for revoked token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        revoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      })

      await expect(service.refreshToken('revoked-token')).rejects.toThrow()
    })
  })
})
