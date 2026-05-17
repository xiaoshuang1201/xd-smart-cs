import { Controller, Post, Get, Param, Body, Headers, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { Response } from 'express';
import { GatewayService } from './gateway.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('访客端 - 对话')
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Public()
  @Post('conversations/:id/messages')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '发送消息' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @Headers('x-session-token') sessionToken: string,
  ) {
    dto.conversationId = conversationId;
    return this.gatewayService.handleIncomingMessage(sessionToken, dto);
  }

  @Public()
  @Get('conversations/:id/stream')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: 'SSE流式接收Agent回复' })
  async streamMessages(
    @Param('id') conversationId: string,
    @Headers('x-session-token') sessionToken: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await this.gatewayService.handleSSEConnection(sessionToken, conversationId, res);
  }
}
