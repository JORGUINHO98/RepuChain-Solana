import { Body, Controller, Get, Header, HttpCode, Inject, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "../services/auth.service";
import { CurrentUser, Public } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { loginSchema, refreshSchema, type LoginInput } from "@repuchain/validation";
import type { AuthenticatedUser } from "@repuchain/shared-types";
@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Public() @Post("login") @HttpCode(200) @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body(new ZodPipe(loginSchema)) input: LoginInput) { return this.auth.login(input); }
  @Public() @Post("refresh") @HttpCode(200) @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  refresh(@Body(new ZodPipe(refreshSchema)) input: { refreshToken: string }) { return this.auth.refresh(input.refreshToken); }
  @Get("me") @Header("Cache-Control", "no-store")
  me(@CurrentUser() user: AuthenticatedUser) { return user; }
  @Post("logout") @HttpCode(200)
  logout(@CurrentUser() user: AuthenticatedUser) { return this.auth.logout(user); }
}
