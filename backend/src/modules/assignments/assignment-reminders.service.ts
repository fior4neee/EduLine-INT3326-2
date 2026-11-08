import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../common/config/env.validation';
import { PrismaService } from '../../common/database/prisma.service';
import { toPublicId } from '../../common/ids/public-id';
import { OutboxService } from '../../events/outbox.service';

const DAY_MS = 24 * 60 * 60 * 1000;

// "Due within 24 hours" reminders (docs/m2-plan.md §5). Runs every
// ASSIGNMENT_REMINDER_INTERVAL_MS in the API, and POST /internal/jobs/assignment-reminders
// lets Cloud Scheduler trigger it. The job only looks for assignments that have
// entered the 24-hour window; each reminder's event id comes from
// (assignment, student), so a student gets at most ONE reminder per assignment,
// however often the job runs and even if the due date changes later.
@Injectable()
export class AssignmentRemindersService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('AssignmentReminders');
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.config.get('ASSIGNMENT_REMINDER_INTERVAL_MS', { infer: true });
    if (intervalMs <= 0) return;
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (err) {
      this.logger.error(`Reminder job failed: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }

  // Writes one ASSIGNMENT_DUE_SOON event per Active student who has not
  // submitted a published, open assignment due in the next 24 hours.
  // The notification handler re-checks everything (and the course subscription)
  // when it runs. Returns how many new reminders were queued.
  async run(now = new Date()): Promise<{ queued: number }> {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        publishedAt: { not: null },
        dueAt: { gt: now, lte: new Date(now.getTime() + DAY_MS) },
        OR: [{ unlockAt: null }, { unlockAt: { lte: now } }],
        course: { visibility: { in: ['Public', 'Restricted'] } },
      },
      select: { id: true, courseId: true, dueAt: true },
    });

    let queued = 0;
    for (const a of assignments) {
      const students = await this.prisma.enrollment.findMany({
        where: {
          courseId: a.courseId,
          status: 'Active',
          user: { submissions: { none: { assignmentId: a.id } } },
        },
        select: { userId: true },
      });
      const dueAt = a.dueAt!.toISOString();
      for (const { userId } of students) {
        const isNew = await this.outbox.addOnce(this.prisma, `${a.id}:${userId}`, 'ASSIGNMENT_DUE_SOON', {
          assignmentId: toPublicId('assignment', a.id),
          courseId: toPublicId('course', a.courseId),
          userId,
          dueAt,
        });
        if (isNew) queued++;
      }
    }
    return { queued };
  }
}
