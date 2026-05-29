import { Module } from '@nestjs/common';
import { TerminusModule, PrismaHealthIndicator } from '@nestjs/terminus';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from '../../infrastructure/redis/redis.health';

@Module({
  imports: [TerminusModule],
  controllers: [SystemController, HealthController],
  providers: [
    SystemService,
    PrismaHealthIndicator,
    RedisHealthIndicator,
  ],
  exports: [SystemService],
})
export class SystemModule {}
