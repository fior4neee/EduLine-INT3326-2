import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { AuthRateLimit } from '../../common/decorators/auth-rate-limit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { PaginationQueryDto } from '../../common/pagination/pagination';
import { CourseStudentsQueryDto, EnrollDto, SetEnrollmentStatusDto } from './dto/enrollment.dto';
import { toEnrollmentResponse } from './enrollment.mapper';
import { EnrollmentsService } from './enrollments.service';

@ApiTags('enrollments')
@ApiBearerAuth()
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  // Rate limited like login, because it checks the course password.
  @Roles('Student')
  @AuthRateLimit()
  @Post('courses/:id/enroll')
  async enroll(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Body() dto: EnrollDto,
  ) {
    return toEnrollmentResponse(
      await this.enrollments.enroll(user, courseId, dto.coursePassword, dto.notifications),
    );
  }

  @Roles('Student')
  @Delete('courses/:id/enroll')
  @HttpCode(204)
  async drop(@CurrentUser() user: AuthUser, @IdParam('id', 'course') courseId: number) {
    await this.enrollments.drop(user, courseId);
  }

  // "My Courses". Empty for Instructors and Admins.
  @Get('me/courses')
  myCourses(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.enrollments.listMine(user, query);
  }

  @Roles('Instructor', 'Admin')
  @Get('courses/:id/students')
  students(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Query() query: CourseStudentsQueryDto,
  ) {
    return this.enrollments.listStudents(user, courseId, query);
  }

  // Suspend or un-suspend a student.
  @Roles('Instructor', 'Admin')
  @Patch('enrollments/:id')
  async setStatus(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'enrollment') id: number,
    @Body() dto: SetEnrollmentStatusDto,
  ) {
    return toEnrollmentResponse(await this.enrollments.setStatus(user, id, dto.status));
  }
}
