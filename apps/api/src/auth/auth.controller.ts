import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards, UsePipes } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  changePasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  type ChangePasswordRequest,
  type LoginRequest,
  type RegisterRequest,
} from "@motorcycle-system/shared-types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedRequest } from "../common/types/authenticated-request.js";
import { getCookieOptions, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_TTL_SECONDS } from "../config/auth.config.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { AuthService } from "./auth.service.js";

import { Inject } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  private readonly authService: AuthService;

  constructor(@Inject(AuthService) authService: AuthService) {
    this.authService = authService;
  }
  @Post("register")
  @UsePipes(new ZodValidationPipe(registerRequestSchema))
  async register(@Body() body: RegisterRequest) {
    return {
      success: true,
      data: await this.authService.registerCustomer(body),
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: Number(process.env.LOGIN_RATE_LIMIT_TTL_MS ?? 60_000), limit: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5) } })
  @UsePipes(new ZodValidationPipe(loginRequestSchema))
  async login(@Body() body: LoginRequest, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body, this.getIp(request));
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getCookieOptions(REFRESH_TOKEN_TTL_SECONDS));

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const result = await this.authService.refresh(refreshToken, this.getIp(request));
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, getCookieOptions(REFRESH_TOKEN_TTL_SECONDS));

    return {
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.logout(request.user.id, refreshToken);
    response.clearCookie(REFRESH_TOKEN_COOKIE, getCookieOptions(0));

    return {
      success: true,
      data: null,
    };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.authService.getCurrentUser(request.user.id),
    };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(changePasswordRequestSchema))
  async changePassword(@Body() body: ChangePasswordRequest, @Req() request: AuthenticatedRequest) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    await this.authService.changePassword(request.user.id, body, refreshToken);

    return {
      success: true,
      data: null,
    };
  }

  private getIp(request: Request) {
    return request.ip ?? request.socket.remoteAddress ?? "unknown";
  }
}
