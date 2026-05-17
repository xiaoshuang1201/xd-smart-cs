import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config
import { appConfig, databaseConfig, redisConfig, jwtConfig, difyConfig, minioConfig, embeddingConfig } from './config/app.config';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { MinioModule } from './infrastructure/minio/minio.module';
import { MilvusModule } from './infrastructure/milvus/milvus.module';
import { DifyModule } from './infrastructure/dify/dify.module';
import { EmbeddingModule } from './infrastructure/embedding/embedding.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { SSEModule } from './infrastructure/sse/sse.module';

// Business Modules
import { AuthModule } from './modules/auth/auth.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { AgentModule } from './modules/agent/agent.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WorkOrderModule } from './modules/work-order/work-order.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SystemModule } from './modules/system/system.module';

// Common
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CustomValidationPipe } from './common/pipes/validation.pipe';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, difyConfig, minioConfig, embeddingConfig],
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    MinioModule,
    MilvusModule,
    DifyModule,
    EmbeddingModule,
    QueueModule,
    SSEModule,

    // Business
    AuthModule,
    GatewayModule,
    ConversationModule,
    AgentModule,
    KnowledgeModule,
    WorkOrderModule,
    AnalyticsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global Guards
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // Global Filters
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },

    // Global Interceptors
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },

    // Global Pipes
    { provide: APP_PIPE, useClass: CustomValidationPipe },
  ],
})
export class AppModule {}
