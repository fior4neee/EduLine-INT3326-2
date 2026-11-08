import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { InternalController } from './internal.controller';
import { OutboxProcessor } from './outbox-processor.service';

// Kept apart from the global EventsModule (which only writes events) so that
// modules writing events do not depend on the modules that handle them.
@Module({
  imports: [NotificationsModule],
  controllers: [InternalController],
  providers: [OutboxProcessor],
  exports: [OutboxProcessor],
})
export class OutboxProcessorModule {}
