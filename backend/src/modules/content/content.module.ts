import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ProgressModule } from '../progress/progress.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [CoursesModule, ProgressModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
