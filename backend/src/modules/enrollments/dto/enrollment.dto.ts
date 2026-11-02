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
