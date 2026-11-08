import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { InternalTokenGuard } from '../common/guards/internal-token.guard';
import { OutboxProcessor } from './outbox-processor.service';

// Cloud Scheduler routes (X-Internal-Token). Not for browsers, not in Swagger.
@ApiExcludeController()
@Public()
@SkipThrottle()
@UseGuards(InternalTokenGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly outbox: OutboxProcessor) {}

  // Safety net: handles any events the in-process loop has not handled yet,
  // e.g. after an instance was stopped. Cloud Scheduler calls it every minute.
  @Post('outbox/flush')
  @HttpCode(200)
  flush() {
    return this.outbox.processPending(1000);
  }
}
