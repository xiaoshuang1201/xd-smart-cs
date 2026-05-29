import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Config
import { appConfig, databaseConfig, redisConfig, jwtConfig, deepseekConfig } from './config/app.config';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { DeepSeekModule } from './infrastructure/deepseek/deepseek.module';
import { SSEModule } from './infrastructure/sse/sse.module';

// Business Modules
import { AuthModule } from './modules/auth/auth.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { AgentModule } from './modules/agent/agent.module';
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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, deepseekConfig],
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    DeepSeekModule,
    SSEModule,

    // Business
    AuthModule,
    GatewayModule,
    ConversationModule,
    AgentModule,
    WorkOrderModule,
    AnalyticsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },

    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },

    { provide: APP_PIPE, useClass: CustomValidationPipe },
  ],
})
export class AppModule {}
