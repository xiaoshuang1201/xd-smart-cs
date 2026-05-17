import { Module } from '@nestjs/common';
import { VisitorConversationController, AdminConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ContextManagerService } from './context-manager.service';
import { MessageService } from './message.service';

@Module({
  controllers: [VisitorConversationController, AdminConversationController],
  providers: [ConversationService, ContextManagerService, MessageService],
  exports: [ConversationService, ContextManagerService, MessageService],
})
export class ConversationModule {}
