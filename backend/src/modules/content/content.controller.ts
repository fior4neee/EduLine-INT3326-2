import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { ContentService } from './content.service';
import { CreateLessonDto, CreateModuleDto } from './dto/content.dto';

// Course staff only. The outline itself is read through GET /courses/:id.
@ApiTags('content')
@ApiBearerAuth()
@Roles('Instructor', 'Admin')
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Post('courses/:id/modules')
  createModule(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Body() dto: CreateModuleDto,
  ) {
    return this.content.createModule(user, courseId, dto);
  }

  @Delete('modules/:id')
  @HttpCode(204)
  async deleteModule(@CurrentUser() user: AuthUser, @IdParam('id', 'module') id: number) {
    await this.content.deleteModule(user, id);
  }

  @Post('modules/:id/lessons')
  createLesson(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'module') moduleId: number,
    @Body() dto: CreateLessonDto,
  ) {
    return this.content.createLesson(user, moduleId, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(204)
  async deleteLesson(@CurrentUser() user: AuthUser, @IdParam('id', 'lesson') id: number) {
    await this.content.deleteLesson(user, id);
  }
}
