import { IsOptional, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { Trim } from '../../../common/validation/transforms';

// Only these fields can be changed by the user. accountType, email,
// username and isVerified are rejected by the global ValidationPipe.
export class UpdateProfileDto {
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @Length(1, 50)
  firstName?: string;

  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @Length(1, 50)
  lastName?: string;

  // null clears it.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
