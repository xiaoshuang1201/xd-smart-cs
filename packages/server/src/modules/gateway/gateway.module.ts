import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { ConversationModule } from '../conversation/conversation.module';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [ConversationModule, AgentModule],
  controllers: [GatewayController],
  providers: [GatewayService],
  exports: [GatewayService],
})
export class GatewayModule {}
