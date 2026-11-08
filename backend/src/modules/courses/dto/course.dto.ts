import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PublicIdArray } from '../../../common/ids/public-id.pipes';
import { PaginationQueryDto } from '../../../common/pagination/pagination';
import { Trim } from '../../../common/validation/transforms';
import { DIFFICULTY_API_VALUES, DifficultyApi } from '../course.mapper';
import { SLUG_MAX_LENGTH, SLUG_REGEX } from '../slug';

const THUMBNAIL_REGEX = /^(https:\/\/[^\s"'<>]+|\/[A-Za-z0-9._~\-/]+)$/;
const SLUG_MESSAGE = 'slug must be lowercase letters, digits and single hyphens';

export class CatalogQueryDto extends PaginationQueryDto {
  // Matches the title or summary.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiProperty({ required: false, enum: DIFFICULTY_API_VALUES })
  @IsOptional()
  @IsIn(DIFFICULTY_API_VALUES)
  difficultyLevel?: DifficultyApi;

  @ApiProperty({ required: false, enum: ['newest', 'title'], default: 'newest' })
  @IsOptional()
  @IsIn(['newest', 'title'])
  sort?: 'newest' | 'title';
}

export class CreateCourseDto {
  @Trim()
  @IsString()
  @Length(3, 200)
  title: string;

  // Generated from the title when omitted.
  @IsOptional()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  shortSummary?: string | null;

  // Short label for course cards, e.g. "Cloud Computing". null clears it.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  category?: string | null;

  // Sent to each student as a notification when they enroll. null clears it.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  welcomeMessage?: string | null;

  // Public cover image: an https URL or a path on the frontend site ("/images/x.png").
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(THUMBNAIL_REGEX, { message: 'thumbnailUrl must be an https URL or a path starting with "/"' })
  thumbnailUrl?: string | null;

  @ApiProperty({ enum: DIFFICULTY_API_VALUES })
  @IsIn(DIFFICULTY_API_VALUES)
  difficultyLevel: DifficultyApi;

  // null = open from now.
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  enrollmentOpensAt?: Date | null;

  // null = never closes.
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  enrollmentClosesAt?: Date | null;

  @IsOptional()
  @IsBoolean()
  hasCertificate?: boolean;

  @IsOptional()
  @PublicIdArray('course')
  prerequisiteCourseIds?: number[];

  // Needed before the course can be published as Restricted. Stored hashed.
  @IsOptional()
  @IsString()
  @Length(4, 64)
  coursePassword?: string;
}

// Every field optional. For nullable fields, null clears the value.
// Visibility is changed only through /publish and DELETE (archive).
export class UpdateCourseDto {
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @Length(3, 200)
  title?: string;

  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
  slug?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  shortSummary?: string | null;

  // Short label for course cards, e.g. "Cloud Computing". null clears it.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(50)
  category?: string | null;

  // Sent to each student as a notification when they enroll. null clears it.
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  welcomeMessage?: string | null;

  // Public cover image: an https URL or a path on the frontend site ("/images/x.png").
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(THUMBNAIL_REGEX, { message: 'thumbnailUrl must be an https URL or a path starting with "/"' })
  thumbnailUrl?: string | null;

  @ApiProperty({ required: false, enum: DIFFICULTY_API_VALUES })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(DIFFICULTY_API_VALUES)
  difficultyLevel?: DifficultyApi;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  enrollmentOpensAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  enrollmentClosesAt?: Date | null;

  @ValidateIf((_, v) => v !== undefined)
  @IsBoolean()
  hasCertificate?: boolean;

  // Replaces the whole list. [] removes all prerequisites.
  @ValidateIf((_, v) => v !== undefined)
  @PublicIdArray('course')
  prerequisiteCourseIds?: number[];

  // A new password replaces the old one; null removes it (not allowed while Restricted).
  @IsOptional()
  @IsString()
  @Length(4, 64)
  coursePassword?: string | null;
}

export class PublishCourseDto {
  @ApiProperty({ enum: ['Public', 'Restricted'] })
  @IsIn(['Public', 'Restricted'])
  visibility: 'Public' | 'Restricted';
}

export class AddInstructorDto {
  @IsUUID()
  userId: string;
}
