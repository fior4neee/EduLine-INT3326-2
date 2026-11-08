import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

// ProgressService is also called by M2: markLessonCompleted from the quiz submit
// transaction and the assignment module.
@Module({
  imports: [EnrollmentsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
