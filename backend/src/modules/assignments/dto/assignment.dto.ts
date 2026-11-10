import { ApiProperty } from '@nestjs/swagger';
import { SubmissionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../../common/validation/transforms';
import { normalizeExtension } from '../assignment-rules';

const EXTENSION_MESSAGE = 'each extension must look like ".pdf" (letters and digits, up to 10)';

// ".PDF" → ".pdf"; anything invalid becomes "" so @Matches rejects it.
const NormalizeExtensions = () =>
  Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? (normalizeExtension(v) ?? '') : v)) : value,
  );

export class CreateAssignmentDto {
  @Trim()
  @IsString()
  @Length(1, 200)
  title: string;

  // What students read (plain text).
  @IsString()
  @MaxLength(20_000)
  instructions: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  maxPoints?: number;

  // At least one of TextEntry, FileUpload. Default: both.
  @ApiProperty({ required: false, enum: SubmissionType, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SubmissionType, { each: true })
  submissionTypes?: SubmissionType[];

  // e.g. [".pdf", ".docx"]. Empty or omitted = any file type.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @NormalizeExtensions()
  @Matches(/^\.[a-z0-9]{1,10}$/, { each: true, message: EXTENSION_MESSAGE })
  allowedExtensions?: string[];

  // "Available from". null/omitted = available as soon as published.
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  unlockAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date | null;

  // Default true. false = nothing can be submitted after dueAt.
  @IsOptional()
  @IsBoolean()
  allowLateSubmissions?: boolean;

  // Shown in the course outline, like other lessons.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedDurationMinutes?: number;
}

// Every field optional. For dates, null clears the value.
export class UpdateAssignmentDto {
  @ValidateIf((_, v) => v !== undefined)
  @Trim()
  @IsString()
  @Length(1, 200)
  title?: string;

  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(20_000)
  instructions?: string;

  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(0)
  @Max(10_000)
  maxPoints?: number;

  @ApiProperty({ required: false, enum: SubmissionType, isArray: true })
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SubmissionType, { each: true })
  submissionTypes?: SubmissionType[];

  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @NormalizeExtensions()
  @Matches(/^\.[a-z0-9]{1,10}$/, { each: true, message: EXTENSION_MESSAGE })
  allowedExtensions?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  unlockAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date | null;

  @ValidateIf((_, v) => v !== undefined)
  @IsBoolean()
  allowLateSubmissions?: boolean;
}

// Either a text entry (textBody) or an uploaded file (fileKey + fileName, after
// POST /assignments/{id}/submissions/upload-url), not both.
export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  @Length(1, 50_000)
  textBody?: string;

  // The key returned by upload-url.
  @IsOptional()
  @IsString()
  @Length(1, 300)
  fileKey?: string;

  // Original file name, shown to the instructor and used for the download.
  @ValidateIf((o: SubmitAssignmentDto) => o.fileKey !== undefined)
  @Trim()
  @IsString()
  @Length(1, 255)
  fileName?: string;
}

export class SubmissionUploadUrlDto {
  @Trim()
  @IsString()
  @Length(1, 255)
  fileName: string;

  // As reported by the browser; stored for the download. Not trusted for checks.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contentType?: string;

  @IsInt()
  @Min(1)
  sizeBytes: number;
}

export class GradeSubmissionDto {
  // 0 ≤ score ≤ maxPoints (checked against the assignment).
  @IsInt()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  feedback?: string | null;
}

export class CreateSubmissionCommentDto {
  @Trim()
  @IsString()
  @Length(1, 5000)
  body: string;
}
