import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

// Sent about every 15 seconds while a video plays. Range checks live in the
// service so that every bad value answers INVALID_PROGRESS.
export class VideoProgressDto {
  @ApiProperty({ example: 312, description: 'video.currentTime, whole seconds' })
  @IsInt()
  positionSeconds: number;

  @ApiProperty({ example: 600, description: 'video.duration, whole seconds' })
  @IsInt()
  durationSeconds: number;
}
