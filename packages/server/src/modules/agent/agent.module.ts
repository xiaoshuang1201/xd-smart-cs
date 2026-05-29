import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { IntentResolverService } from './intent-resolver.service';

@Module({
  controllers: [AgentController],
  providers: [AgentService, IntentResolverService],
  exports: [AgentService, IntentResolverService],
})
export class AgentModule {}
