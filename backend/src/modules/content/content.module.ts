import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [CoursesModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
