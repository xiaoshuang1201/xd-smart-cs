import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!user || user.status !== 'active') return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    await this.prisma.refreshToken.create({
      data: {
        adminUserId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 7200,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.adminUser.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (existing) throw new ConflictException('用户名或邮箱已存在');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.adminUser.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName || dto.username,
      },
      select: { id: true, username: true, displayName: true, role: true },
    });
  }

  async refreshToken(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token已过期或无效');
    }

    const user = await this.prisma.adminUser.findUnique({
      where: { id: stored.adminUserId },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('账户已被禁用');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, expiresIn: 7200 };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { adminUserId: userId, revoked: false },
      data: { revoked: true },
    });
    return { loggedOut: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        lastLoginAt: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }
}
