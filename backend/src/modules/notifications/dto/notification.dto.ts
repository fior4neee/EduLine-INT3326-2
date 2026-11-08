import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { NotificationType } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination';

export class NotificationsQueryDto extends PaginationQueryDto {
  // ?unread=true lists unread notifications only.
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  unread?: boolean;

  // ?types=AssignmentPublished,AssignmentGraded lists only those types (inbox tabs).
  @ApiProperty({ required: false, enum: NotificationType, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsArray()
  @ArrayMaxSize(20)
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];
}

export const PERMISSION_VALUES = ['Default', 'Granted', 'Denied'] as const;
export type PermissionValue = (typeof PERMISSION_VALUES)[number];

export class SetSubscriptionDto {
  @ApiProperty({ enum: PERMISSION_VALUES })
  @IsIn(PERMISSION_VALUES)
  status: PermissionValue;
}
