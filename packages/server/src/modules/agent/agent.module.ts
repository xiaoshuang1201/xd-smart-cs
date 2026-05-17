import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { IntentResolverService } from './intent-resolver.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, CircuitBreakerService, IntentResolverService],
  exports: [AgentService, IntentResolverService],
})
export class AgentModule {}
