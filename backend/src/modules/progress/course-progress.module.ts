import { Module } from '@nestjs/common';
import { CourseProgressService } from './course-progress.service';

@Module({
  providers: [CourseProgressService],
  exports: [CourseProgressService],
})
export class CourseProgressModule {}
