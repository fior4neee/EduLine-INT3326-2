import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { ContentService } from './content.service';
import { CreateLessonDto, CreateModuleDto } from './dto/content.dto';

// Writes are course staff only. The outline is read through GET /courses/:id.
@ApiTags('content')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  // Lesson viewer. Public so free preview lessons open without logging in;
  // every other lesson needs an enrollment (or course staff).
  @Public()
  @Get('lessons/:id')
  getLesson(@CurrentUser() user: AuthUser | undefined, @IdParam('id', 'lesson') id: number) {
    return this.content.getLesson(user, id);
  }

  @Roles('Instructor', 'Admin')
  @Post('courses/:id/modules')
  createModule(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Body() dto: CreateModuleDto,
  ) {
    return this.content.createModule(user, courseId, dto);
  }

  @Roles('Instructor', 'Admin')
  @Delete('modules/:id')
  @HttpCode(204)
  async deleteModule(@CurrentUser() user: AuthUser, @IdParam('id', 'module') id: number) {
    await this.content.deleteModule(user, id);
  }

  @Roles('Instructor', 'Admin')
  @Post('modules/:id/lessons')
  createLesson(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'module') moduleId: number,
    @Body() dto: CreateLessonDto,
  ) {
    return this.content.createLesson(user, moduleId, dto);
  }

  @Roles('Instructor', 'Admin')
  @Delete('lessons/:id')
  @HttpCode(204)
  async deleteLesson(@CurrentUser() user: AuthUser, @IdParam('id', 'lesson') id: number) {
    await this.content.deleteLesson(user, id);
  }
}
