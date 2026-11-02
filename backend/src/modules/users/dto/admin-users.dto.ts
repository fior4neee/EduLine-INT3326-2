import { AccountType, InstructorRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { Trim } from '../../../common/validation/transforms';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  // e.g. ?instructorRequestStatus=Pending lists accounts waiting for approval.
  @IsOptional()
  @IsEnum(InstructorRequestStatus)
  instructorRequestStatus?: InstructorRequestStatus;

  // Matches username, email, first or last name.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class UpdateAccountTypeDto {
  @IsEnum(AccountType)
  accountType: AccountType;
}
