import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { paginated, PaginationQueryDto } from '../../common/pagination/pagination';
import { CoursesService } from './courses.service';
import {
  AddInstructorDto,
  CatalogQueryDto,
  CreateCourseDto,
  PublishCourseDto,
  UpdateCourseDto,
} from './dto/course.dto';

@ApiTags('courses')
@ApiBearerAuth()
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // Public catalog (Public + Restricted). ?q=&difficultyLevel=&sort=newest|title
  @Public()
  @Get('courses')
  async catalog(@Query() query: CatalogQueryDto) {
    const page = await this.courses.listCatalog(query);
    return paginated(await this.courses.present(page.data), page.meta.total, query);
  }

  // Detail + outline. Accepts crs_1234, 1234 or the slug.
  @Public()
  @Get('courses/:idOrSlug')
  detail(@CurrentUser() user: AuthUser | undefined, @Param('idOrSlug') idOrSlug: string) {
    return this.courses.getDetail(user, idOrSlug);
  }

  @Roles('Instructor', 'Admin')
  @Get('instructor/courses')
  async mine(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    const page = await this.courses.listForInstructor(user, query);
    return paginated(await this.courses.present(page.data), page.meta.total, query);
  }

  @Roles('Instructor', 'Admin')
  @Post('courses')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.courses.presentOne(await this.courses.create(user, dto));
  }

  @Roles('Instructor', 'Admin')
  @Patch('courses/:id')
  async update(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') id: number,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.presentOne(await this.courses.update(user, id, dto));
  }

  @Roles('Instructor', 'Admin')
  @Post('courses/:id/publish')
  @HttpCode(200)
  async publish(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') id: number,
    @Body() dto: PublishCourseDto,
  ) {
    return this.courses.presentOne(await this.courses.publish(user, id, dto.visibility));
  }

  // Archives the course (soft delete).
  @Roles('Instructor', 'Admin')
  @Delete('courses/:id')
  async archive(@CurrentUser() user: AuthUser, @IdParam('id', 'course') id: number) {
    return this.courses.presentOne(await this.courses.archive(user, id));
  }

  @Roles('Instructor', 'Admin')
  @Post('courses/:id/instructors')
  @HttpCode(200)
  async addInstructor(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') id: number,
    @Body() dto: AddInstructorDto,
  ) {
    return this.courses.presentOne(await this.courses.addInstructor(user, id, dto.userId));
  }

  @Roles('Instructor', 'Admin')
  @Delete('courses/:id/instructors/:userId')
  async removeInstructor(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') id: number,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.courses.presentOne(await this.courses.removeInstructor(user, id, userId));
  }
}
