import { Module } from '@nestjs/common';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { EventPublisher } from './event-publisher.service';
import { InternalController } from './internal.controller';
import { OutboxProcessor } from './outbox-processor.service';

// Kept apart from the global EventsModule (which only writes events) so that
// modules writing events do not depend on the modules that handle them.
@Module({
  imports: [NotificationsModule],
  controllers: [InternalController],
  providers: [OutboxProcessor, EventPublisher],
  exports: [OutboxProcessor],
})
export class OutboxProcessorModule {}
