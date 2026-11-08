import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { AuthRateLimit } from '../../common/decorators/auth-rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/auth.dto';

// The logged-in user's own account.
@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class AccountController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Get()
  async me(@CurrentUser() caller: AuthUser) {
    return this.auth.userResponse(await this.users.getById(caller.id));
  }

  @Patch()
  async updateProfile(@CurrentUser() caller: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.userResponse(await this.users.updateProfile(caller.id, dto));
  }

  @AuthRateLimit()
  @Patch('password')
  @HttpCode(204)
  async changePassword(@CurrentUser() caller: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(caller, dto);
  }

  // Ask (again) to become an Instructor. An Admin approves or rejects it.
  @Post('instructor-request')
  @HttpCode(200)
  async requestInstructor(@CurrentUser() caller: AuthUser) {
    return this.auth.userResponse(await this.users.requestInstructorRole(caller.id));
  }
}
