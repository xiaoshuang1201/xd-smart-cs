import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { KnowledgeQueueProcessor } from './queues/knowledge.queue';
import { AnalyticsQueueProcessor } from './queues/analytics.queue';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'document-process' },
      { name: 'analytics-report' },
      { name: 'notification' },
    ),
  ],
  providers: [QueueService, KnowledgeQueueProcessor, AnalyticsQueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
