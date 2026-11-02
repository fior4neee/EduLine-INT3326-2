import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { UsersService } from './users.service';

// The current user's own endpoints (/users/me…) live in AuthModule's
// AccountController, because they need both users and enrollments.
@Module({
  controllers: [AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
