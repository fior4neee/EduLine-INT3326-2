import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { CourseProgressModule } from '../progress/course-progress.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [CoursesModule, UsersModule, CourseProgressModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
