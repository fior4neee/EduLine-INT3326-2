import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';

export class EnrollDto {
  // Required for Restricted courses, ignored otherwise.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  coursePassword?: string;

  // Answer to "receive notifications from this course?" in the enroll dialog.
  // Omitted = not answered (Default, behaves like Granted).
  @ApiProperty({ required: false, enum: ['Granted', 'Denied'] })
  @IsOptional()
  @IsIn(['Granted', 'Denied'])
  notifications?: 'Granted' | 'Denied';
}

export class CourseStudentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}

export class SetEnrollmentStatusDto {
  @ApiProperty({ enum: ['Suspended', 'Active'] })
  @IsIn(['Suspended', 'Active'])
  status: 'Suspended' | 'Active';
}
