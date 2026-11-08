import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard';
import { AssignmentRemindersService } from './assignment-reminders.service';

// Cloud Scheduler route (X-Internal-Token). Not for browsers, not in Swagger.
@ApiExcludeController()
@Public()
@SkipThrottle()
@UseGuards(InternalTokenGuard)
@Controller('internal/jobs')
export class AssignmentsInternalController {
  constructor(private readonly reminders: AssignmentRemindersService) {}

  @Post('assignment-reminders')
  @HttpCode(200)
  run() {
    return this.reminders.run();
  }
}
