import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { Trim } from '../../../common/validation/transforms';

export class CreateModuleDto {
  @Trim()
  @IsString()
  @Length(1, 200)
  title: string;
}

// Quiz and Assignment lessons are created with their quiz/assignment (week 6).
// Video and Document files are uploaded separately (week 4, signed URLs).
export const CREATABLE_LESSON_TYPES = ['Text', 'Video', 'Document'] as const;

export class CreateLessonDto {
  @Trim()
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ enum: CREATABLE_LESSON_TYPES })
  @IsIn(CREATABLE_LESSON_TYPES)
  type: (typeof CREATABLE_LESSON_TYPES)[number];

  // Body of a Text lesson (plain text or Markdown).
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  textContent?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedDurationMinutes?: number;

  // Free preview: visible without enrolling.
  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
