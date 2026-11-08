import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { CourseStudentsQueryDto } from '../enrollments/dto/enrollment.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles('Instructor', 'Admin')
@Controller('instructor/courses/:id/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @IdParam('id', 'course') courseId: number) {
    return this.analytics.overview(user, courseId);
  }

  @Get('students')
  students(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Query() query: CourseStudentsQueryDto,
  ) {
    return this.analytics.students(user, courseId, query);
  }
}
