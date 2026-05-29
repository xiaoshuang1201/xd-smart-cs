import { Controller, Post, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('管理后台 - Agent配置')
@ApiBearerAuth()
@Roles('super_admin', 'knowledge_admin')
@Controller('admin/agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('test')
  @ApiOperation({ summary: 'Agent对话测试' })
  async testAgent(@Body() body: { query: string; config?: Record<string, unknown> }) {
    return this.agentService.testQuery(body.query);
  }

  @Get('config')
  @ApiOperation({ summary: '获取Agent配置' })
  getConfig() {
    return this.agentService.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: '更新Agent配置' })
  updateConfig(@Body() config: Record<string, unknown>) {
    return this.agentService.updateConfig(config);
  }
}
