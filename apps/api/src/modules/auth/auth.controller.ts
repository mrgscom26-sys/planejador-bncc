import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { env } from '../../config/env.config';
import { UserResponse, AuthResponse } from '@planejador-bncc/shared-types';

const COOKIE_NAME = 'bncc_refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: env.COOKIE_SECURE,
      path: '/api/auth',
      maxAge: env.REFRESH_TOKEN_EXPIRES_IN_HOURS * 60 * 60 * 1000,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email?: string; password?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    if (!body?.email || !body?.password) {
      throw new UnauthorizedException('E-mail e senha são obrigatórios.');
    }

    const result = await this.authService.login(body.email, body.password);

    res.cookie(COOKIE_NAME, result.rawRefreshToken, this.getCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME];
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Cookie de refresh token não encontrado.');
    }

    const result = await this.authService.refreshTokens(rawRefreshToken);

    res.cookie(COOKIE_NAME, result.rawRefreshToken, this.getCookieOptions());

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const rawRefreshToken = req.cookies?.[COOKIE_NAME];
    await this.authService.logout(rawRefreshToken);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'strict',
      secure: env.COOKIE_SECURE,
      path: '/api/auth',
    });

    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: UserResponse): Promise<UserResponse> {
    return user;
  }
}
