import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ProgressModule } from '../progress/progress.module';
import { AssignmentRemindersService } from './assignment-reminders.service';
import { AssignmentsInternalController } from './assignments-internal.controller';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [CoursesModule, ProgressModule],
  controllers: [AssignmentsController, AssignmentsInternalController],
  providers: [AssignmentsService, AssignmentRemindersService],
  exports: [AssignmentsService, AssignmentRemindersService],
})
export class AssignmentsModule {}
