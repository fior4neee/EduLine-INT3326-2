import { Body, Controller, Delete, Get, HttpCode, Patch, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdParam } from '../../common/ids/public-id.pipes';
import { NotificationsQueryDto, SetSubscriptionDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

// Every route works on the caller's own notifications and subscriptions only.
@ApiTags('notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  // Newest first. ?unread=true&page=&pageSize=
  @Get('notifications')
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.notifications.list(user, query);
  }

  // For the bell badge; the frontend polls it about every 30 seconds.
  @Get('notifications/unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Patch('notifications/read-all')
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Get('notifications/:id')
  getOne(@CurrentUser() user: AuthUser, @IdParam('id', 'notification') id: number) {
    return this.notifications.getOne(user, id);
  }

  @Patch('notifications/:id/read')
  read(@CurrentUser() user: AuthUser, @IdParam('id', 'notification') id: number) {
    return this.notifications.markRead(user, id);
  }

  @Patch('notifications/:id/unread')
  unread(@CurrentUser() user: AuthUser, @IdParam('id', 'notification') id: number) {
    return this.notifications.markUnread(user, id);
  }

  @Delete('notifications/:id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @IdParam('id', 'notification') id: number) {
    await this.notifications.remove(user, id);
  }

  @Get('me/subscriptions')
  subscriptions(@CurrentUser() user: AuthUser) {
    return this.notifications.listSubscriptions(user);
  }

  @Get('courses/:id/subscription')
  getSubscription(@CurrentUser() user: AuthUser, @IdParam('id', 'course') courseId: number) {
    return this.notifications.getSubscription(user, courseId);
  }

  @Put('courses/:id/subscription')
  setSubscription(
    @CurrentUser() user: AuthUser,
    @IdParam('id', 'course') courseId: number,
    @Body() dto: SetSubscriptionDto,
  ) {
    return this.notifications.updateSubscription(user, courseId, dto.status);
  }
}
