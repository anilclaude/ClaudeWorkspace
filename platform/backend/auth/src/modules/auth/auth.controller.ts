import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { auth } from '@app/contracts';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Uniform on purpose, not just in the response body: both the AC1 success
  // branch and the AC2 credential-mismatch branch return HTTP 200. Using a
  // different status per branch (e.g. 401 on failure) would let a caller
  // distinguish "wrong password" from "unregistered email" from "malformed
  // request" purely from the status code, even with an identical body — the
  // same enumeration leak AC2 is written to prevent, just moved into a
  // different layer of the response. A malformed request body is the one
  // exception (400): that is a client bug, not a credential outcome, so
  // AC2's uniformity guarantee does not extend to it.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown): Promise<auth.LoginResponse> {
    const parsed = auth.loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid login request');
    }

    return this.authService.login(parsed.data);
  }
}
