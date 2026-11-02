import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [UsersModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
