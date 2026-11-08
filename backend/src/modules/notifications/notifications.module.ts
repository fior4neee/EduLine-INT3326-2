import { Module } from '@nestjs/common';
import { NotificationFanoutService } from './notification-fanout.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationFanoutService],
  exports: [NotificationsService, NotificationFanoutService],
})
export class NotificationsModule {}
