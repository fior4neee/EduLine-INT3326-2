import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { ContentService } from './content.service';
import {
  CreateLessonDto,
  CreateModuleDto,
  LessonUploadCompleteDto,
  LessonUploadUrlDto,
} from './dto/content.dto';
import { LessonMediaService } from './lesson-media.service';

// Writes are course staff only. The outline is read through GET /courses/:id.
@ApiTags('content')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly media: LessonMediaService,
  ) {}

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

  // ─── Lesson files (docs/storage-cdn-iam.md §3) ────────────────────────────

  // Step 1: a link the browser PUTs the file to, valid 15 minutes.
  @Roles('Instructor', 'Admin')
  @Post('lessons/:id/content/upload-url')
  uploadUrl(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'lesson') id: number,
    @Body() dto: LessonUploadUrlDto,
  ) {
    return this.media.uploadUrl(user, id, dto.kind, dto.contentType, dto.sizeBytes);
  }

  // Step 2, after the PUT: checks size, type and file signature, then attaches the
  // file to the lesson. Returns the lesson as students see it.
  @Roles('Instructor', 'Admin')
  @Post('lessons/:id/content/complete')
  @HttpCode(200)
  async complete(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'lesson') id: number,
    @Body() dto: LessonUploadCompleteDto,
  ) {
    await this.media.complete(user, id, dto.kind, dto.key);
    return this.content.getLesson(user, id);
  }

  @Roles('Instructor', 'Admin')
  @Delete('lessons/:id/content/video')
  @HttpCode(204)
  async removeVideo(@CurrentUser() user: AuthUser, @IdParam('id', 'lesson') id: number) {
    await this.media.removeVideo(user, id);
  }

  // `index` = position in the lesson's downloadableResources (0 = first).
  @Roles('Instructor', 'Admin')
  @Delete('lessons/:id/content/resources/:index')
  @HttpCode(204)
  async removeResource(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'lesson') id: number,
    @Param('index', ParseIntPipe) index: number,
  ) {
    await this.media.removeResource(user, id, index);
  }
}
