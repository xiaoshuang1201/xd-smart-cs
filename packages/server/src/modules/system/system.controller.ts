import { Controller, Get, Put, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemService } from './system.service';

@ApiTags('系统管理')
@ApiBearerAuth()
@Roles('super_admin')
@Controller('admin/system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('configs')
  @ApiOperation({ summary: '获取全部系统配置' })
  getConfigs() {
    return this.systemService.getAllConfigs();
  }

  @Put('configs/:key')
  @ApiOperation({ summary: '更新系统配置' })
  updateConfig(@Param('key') key: string, @Body() body: { value: unknown }) {
    return this.systemService.updateConfig(key, body.value);
  }

  @Post('cache/clear')
  @ApiOperation({ summary: '清除缓存' })
  clearCache(@Body() body: { type?: string }) {
    return this.systemService.clearCache(body.type);
  }

  @Get('users')
  @ApiOperation({ summary: '管理员列表' })
  getUsers() {
    return this.systemService.getUsers();
  }

  @Post('users')
  @ApiOperation({ summary: '创建管理员' })
  createUser(@Body() body: Record<string, unknown>) {
    return this.systemService.createUser(body);
  }
}
