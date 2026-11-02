import {
  Body,
  Controller,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { paginated } from '../../common/pagination/pagination';
import { AdminUsersQueryDto, UpdateAccountTypeDto } from './dto/admin-users.dto';
import { toUserResponse } from './user.mapper';
import { UsersService } from './users.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('Admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  // ?instructorRequestStatus=Pending gives the approval queue.
  @Get()
  async list(@Query() query: AdminUsersQueryDto) {
    const page = await this.users.list(query);
    return paginated(
      page.data.map((u) => toUserResponse(u)),
      page.meta.total,
      query,
    );
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return toUserResponse(await this.users.getById(id));
  }

  // The only way to change accountType.
  @Patch(':id')
  async setAccountType(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountTypeDto,
  ) {
    return toUserResponse(await this.users.setAccountType(admin, id, dto.accountType));
  }

  @Post(':id/instructor-request/approve')
  @HttpCode(200)
  async approve(@Param('id', ParseUUIDPipe) id: string) {
    return toUserResponse(await this.users.decideInstructorRequest(id, true));
  }

  @Post(':id/instructor-request/reject')
  @HttpCode(200)
  async reject(@Param('id', ParseUUIDPipe) id: string) {
    return toUserResponse(await this.users.decideInstructorRequest(id, false));
  }
}
