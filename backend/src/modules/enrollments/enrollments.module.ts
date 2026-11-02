import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [CoursesModule, UsersModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
