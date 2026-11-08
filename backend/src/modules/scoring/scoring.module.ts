import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';

// Imported by M2's quizzes module, which calls ScoringService inside the submit transaction.
@Module({
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
