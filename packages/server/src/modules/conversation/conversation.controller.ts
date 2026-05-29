import { Controller, Get, Post, Param, Body, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ConversationService } from './conversation.service';
import { Public } from '../../common/decorators/public.decorator';

// ========== 访客端 Controller ==========
@ApiTags('访客端 - 会话')
@Controller()
export class VisitorConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Public()
  @Get('conversations')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '获取访客历史会话列表' })
  getConversations(
    @Headers('x-session-token') token: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
  ) {
    return this.conversationService.getVisitorConversations(token, +page, +pageSize);
  }

  @Public()
  @Get('conversations/:id/messages')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '获取指定会话消息列表' })
  getMessages(
    @Param('id') id: string,
    @Headers('x-session-token') token: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
    @Query('order') order: 'asc' | 'desc' = 'asc',
  ) {
    return this.conversationService.getVisitorMessages(token, id, +page, +pageSize);
  }

  @Public()
  @Post('conversations/:id/close')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '关闭会话' })
  closeConversation(
    @Param('id') id: string,
    @Headers('x-session-token') token: string,
  ) {
    return this.conversationService.closeConversation(id, token);
  }

  @Public()
  @Post('conversations/:id/transfer')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '请求转人工' })
  transferToHuman(
    @Param('id') id: string,
    @Headers('x-session-token') token: string,
    @Body() body: { reason?: string; contact?: string; contactType?: string },
  ) {
    return this.conversationService.transferToHuman(id, token, body);
  }
}

// ========== 管理后台 Controller ==========
@ApiTags('管理后台 - 对话管理')
@Controller('admin/conversations')
export class AdminConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  @ApiOperation({ summary: '对话列表' })
  getConversations(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.conversationService.listConversations({ page: +page, pageSize: +pageSize, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '对话详情(含消息列表)' })
  getConversation(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 50,
  ) {
    return this.conversationService.getConversationDetail(id, +page, +pageSize);
  }
}
