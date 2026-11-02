import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { UsersModule } from '../users/users.module';
import { AccountController } from './account.controller';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [UsersModule, EnrollmentsModule],
  controllers: [AuthController, AccountController],
  providers: [AuthService, TokenService],
})
export class AuthModule {}
