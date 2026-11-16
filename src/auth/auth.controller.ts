import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, SESSION_COOKIE, SESSION_SECONDS } from './auth.service.js';
import { ChangePasswordDto, LoginDto } from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookie(response: Response, token: string) {
    response.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS * 1000 });
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() data: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(data.username, data.password, request.ip || 'unknown');
    this.setCookie(response, result.token);
    return { user: result.user };
  }

  @Get('session')
  async session(@Req() request: Request) {
    return { user: await this.auth.requireUser(request, true) };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request);
    response.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@Body() data: ChangePasswordDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.changePassword(request, data.currentPassword, data.newPassword);
    this.setCookie(response, result.token);
    return { user: result.user };
  }
}
