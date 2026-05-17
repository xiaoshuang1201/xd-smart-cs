import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('App E2E', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Health', () => {
    it('GET /api/v1/health should return health status', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health')
      expect(res.status).toBeLessThan(500)
    })
  })

  describe('Auth - Session', () => {
    it('POST /api/v1/auth/session should create visitor session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/session')
        .send({ fingerprint: 'test-fp-001' })

      expect(res.status).toBe(201)
      expect(res.body.code).toBe(0)
      expect(res.body.data.sessionToken).toBeDefined()
      expect(res.body.data.conversationId).toBeDefined()
      expect(res.body.data.csrfToken).toBeDefined()
    })

    it('GET /api/v1/auth/session should validate session', async () => {
      // First create a session
      const create = await request(app.getHttpServer())
        .post('/api/v1/auth/session')
        .send({ fingerprint: 'test-fp-002' })

      const token = create.body.data.sessionToken

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('X-Session-Token', token)

      expect(res.status).toBe(200)
      expect(res.body.data.valid).toBe(true)
    })

    it('GET /api/v1/auth/session should return invalid for bad token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('X-Session-Token', 'bad-token')

      expect(res.body.data.valid).toBe(false)
    })
  })

  describe('Auth - Admin', () => {
    it('POST /api/v1/admin/auth/login should reject invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ username: 'nobody', password: 'wrong' })

      expect(res.status).toBe(401)
    })

    it('POST /api/v1/admin/auth/register should create admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/register')
        .send({
          username: 'test_admin_' + Date.now(),
          password: 'Test123!',
          email: 'test@test.com',
          displayName: 'Test Admin',
        })

      expect(res.status).toBe(201)
      expect(res.body.data.username).toBeDefined()
    })
  })
})
