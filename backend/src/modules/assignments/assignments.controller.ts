import { Body, Controller, Delete, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentDto,
  CreateSubmissionCommentDto,
  GradeSubmissionDto,
  SubmitAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller()
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  // ─── Course staff ─────────────────────────────────────────────────────────

  // Creates the Assignment lesson at the end of the module, as a draft.
  @Roles('Instructor', 'Admin')
  @Post('modules/:id/assignments')
  create(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'module') moduleId: number,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignments.create(user, moduleId, dto);
  }

  @Roles('Instructor', 'Admin')
  @Patch('assignments/:id')
  update(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'assignment') id: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignments.update(user, id, dto);
  }

  // Visible to students and notifies the class. Publishing again does nothing.
  @Roles('Instructor', 'Admin')
  @Post('assignments/:id/publish')
  @HttpCode(200)
  publish(@CurrentUser() user: AuthUser, @IdParam('id', 'assignment') id: number) {
    return this.assignments.publish(user, id);
  }

  @Roles('Instructor', 'Admin')
  @Delete('assignments/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @IdParam('id', 'assignment') id: number) {
    await this.assignments.remove(user, id);
  }

  // Gradebook: every student, including those who have not submitted.
  @Roles('Instructor', 'Admin')
  @Get('assignments/:id/submissions')
  submissions(@CurrentUser() user: AuthUser, @IdParam('id', 'assignment') id: number) {
    return this.assignments.listSubmissions(user, id);
  }

  @Roles('Instructor', 'Admin')
  @Patch('submissions/:id/grade')
  grade(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'submission') id: number,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignments.grade(user, id, dto);
  }

  // ─── Students and staff ───────────────────────────────────────────────────

  // Staff see every assignment; students see published ones with their own state.
  @Get('courses/:id/assignments')
  listForCourse(@CurrentUser() user: AuthUser, @IdParam('id', 'course') courseId: number) {
    return this.assignments.listForCourse(user, courseId);
  }

  @Get('assignments/:id')
  get(@CurrentUser() user: AuthUser, @IdParam('id', 'assignment') id: number) {
    return this.assignments.get(user, id);
  }

  @Roles('Student')
  @Post('assignments/:id/submissions')
  submit(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'assignment') id: number,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignments.submit(user, id, dto);
  }

  @Get('submissions/:id')
  submission(@CurrentUser() user: AuthUser, @IdParam('id', 'submission') id: number) {
    return this.assignments.getSubmission(user, id);
  }

  @Get('submissions/:id/comments')
  comments(@CurrentUser() user: AuthUser, @IdParam('id', 'submission') id: number) {
    return this.assignments.listComments(user, id);
  }

  @Post('submissions/:id/comments')
  addComment(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'submission') id: number,
    @Body() dto: CreateSubmissionCommentDto,
  ) {
    return this.assignments.addComment(user, id, dto);
  }
}
