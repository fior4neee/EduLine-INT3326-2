import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Trim, TrimLower } from '../../../common/validation/transforms';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_REGEX } from '../password-policy';

// Login does not apply the policy (old passwords must still work), only a length cap.
const MAX_PASSWORD_INPUT = 128;

export class RegisterDto {
  // Stored lowercase. Letters, digits, dot, underscore, hyphen.
  @TrimLower()
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'username may contain only letters, digits, ".", "_" and "-"',
  })
  username: string;

  @Trim()
  @IsString()
  @Length(1, 50)
  firstName: string;

  @Trim()
  @IsString()
  @Length(1, 50)
  lastName: string;

  @TrimLower()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  // "Instructor" creates a Student account with a pending instructor request.
  // An Admin must approve it before the account gets instructor rights.
  @ApiProperty({ required: false, enum: ['Student', 'Instructor'], default: 'Student' })
  @IsOptional()
  @IsIn(['Student', 'Instructor'])
  accountType?: 'Student' | 'Instructor';
}

export class LoginDto {
  // Username or email.
  @TrimLower()
  @IsString()
  @Length(1, 254)
  username: string;

  @IsString()
  @Length(1, MAX_PASSWORD_INPUT)
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @Length(20, 200)
  refreshToken: string;
}

export class ForgotPasswordDto {
  @TrimLower()
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class ResetPasswordDto {
  // From the emailed link: <FRONTEND_URL>/reset-password?token=...
  @IsString()
  @Length(20, 200)
  token: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, MAX_PASSWORD_INPUT)
  currentPassword: string;

  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_POLICY_MESSAGE })
  newPassword: string;
}
