import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthRateLimit } from '../../common/decorators/auth-rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @AuthRateLimit()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @AuthRateLimit()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @AuthRateLimit()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @AuthRateLimit()
  @Post('forgot-password')
  @HttpCode(202)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  @AuthRateLimit()
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
  }
}
