import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('管理后台 - 数据看板')
@ApiBearerAuth()
@Roles('super_admin', 'customer_service', 'knowledge_admin')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '核心指标看板' })
  getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDashboard(startDate, endDate);
  }

  @Get('conversations')
  @ApiOperation({ summary: '对话统计' })
  getConversationStats() {
    return this.analyticsService.getConversationStats();
  }

  @Get('knowledge')
  @ApiOperation({ summary: '知识库统计' })
  getKnowledgeStats() {
    return this.analyticsService.getKnowledgeStats();
  }
}
