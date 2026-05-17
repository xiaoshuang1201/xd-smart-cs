import { Controller, Post, Get, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { LoginDto, RegisterDto, RefreshTokenDto, CreateSessionDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('认证')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post('auth/session')
  @ApiOperation({ summary: '创建访客会话' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
  }

  @Public()
  @Get('auth/session')
  @ApiHeader({ name: 'X-Session-Token', required: true })
  @ApiOperation({ summary: '验证会话有效性' })
  verifySession(@Headers('x-session-token') token: string) {
    return this.sessionService.verifySession(token);
  }

  @Public()
  @Post('admin/auth/login')
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: '管理员登录' })
  adminLogin(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('admin/auth/register')
  @ApiOperation({ summary: '管理员注册' })
  adminRegister(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('admin/auth/refresh')
  @ApiOperation({ summary: '刷新Token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('admin/auth/logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  logout(@CurrentUser() user: any) {
    return this.authService.logout(user.sub);
  }

  @Get('admin/auth/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub);
  }
}
