import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkOrderService } from './work-order.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('管理后台 - 工单')
@ApiBearerAuth()
@Roles('super_admin', 'customer_service')
@Controller('admin/work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get()
  @ApiOperation({ summary: '工单列表' })
  getWorkOrders(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.workOrderService.list({
      page: +page,
      pageSize: +pageSize,
      status,
      priority,
      assigneeId,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '工单统计' })
  getStats() {
    return this.workOrderService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '工单详情' })
  getWorkOrder(@Param('id') id: string) {
    return this.workOrderService.getDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工单' })
  updateWorkOrder(@Param('id') id: string, @Body() data: Record<string, unknown>) {
    return this.workOrderService.update(id, data);
  }
}
