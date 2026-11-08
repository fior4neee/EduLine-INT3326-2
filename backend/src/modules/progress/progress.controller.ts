import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { VideoProgressDto } from './dto/progress.dto';
import { ProgressService } from './progress.service';

@ApiTags('progress')
@ApiBearerAuth()
@Controller()
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  // Video player heartbeat, about every 15 seconds.
  @Put('lessons/:id/progress')
  reportVideo(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'lesson') lessonId: number,
    @Body() dto: VideoProgressDto,
  ) {
    return this.progress.reportVideoProgress(user, lessonId, dto);
  }

  // "Mark as complete" on a text or document lesson.
  @Post('lessons/:id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: AuthUser, @IdParam('id', 'lesson') lessonId: number) {
    return this.progress.completeLesson(user, lessonId);
  }

  @Get('lessons/:id/progress')
  lesson(@CurrentUser() user: AuthUser, @IdParam('id', 'lesson') lessonId: number) {
    return this.progress.getLessonProgress(user, lessonId);
  }

  @Get('courses/:id/progress/me')
  course(@CurrentUser() user: AuthUser, @IdParam('id', 'course') courseId: number) {
    return this.progress.getCourseProgress(user, courseId);
  }
}
