import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../common/config/env.validation';
import { PrismaService } from '../common/database/prisma.service';
import { NotificationFanoutService } from '../modules/notifications/notification-fanout.service';
import type { EventType } from './event-types';

interface OutboxRow {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
}

export interface ProcessResult {
  processed: number;
  failed: number;
}

// Handles outbox events inside the API (docs/m2-plan.md §5): every few seconds it
// takes the oldest unhandled event, creates its notifications and marks it
// handled, in one transaction. "FOR UPDATE SKIP LOCKED" lets several API
// instances run this at once without handling the same event twice. A failing
// event is retried on later ticks, up to OUTBOX_MAX_ATTEMPTS, then left aside
// with its lastError so it cannot block the queue.
@Injectable()
export class OutboxProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('OutboxProcessor');
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.config.get('OUTBOX_POLL_INTERVAL_MS', { infer: true });
    if (intervalMs <= 0) return; // disabled, e.g. in integration tests
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return; // previous tick still busy
    this.running = true;
    try {
      await this.processPending();
    } catch (err) {
      this.logger.error(`Outbox tick failed: ${String(err)}`);
    } finally {
      this.running = false;
    }
  }

  // Handles up to `limit` events. Stops at the first failure so a broken event
  // is retried on the next tick rather than in a tight loop.
  async processPending(limit = 200): Promise<ProcessResult> {
    const result: ProcessResult = { processed: 0, failed: 0 };
    while (result.processed + result.failed < limit) {
      const outcome = await this.processOne();
      if (outcome === 'empty') break;
      if (outcome === 'failed') {
        result.failed++;
        break;
      }
      result.processed++;
    }
    return result;
  }

  private async processOne(): Promise<'done' | 'failed' | 'empty'> {
    const maxAttempts = this.config.get('OUTBOX_MAX_ATTEMPTS', { infer: true });
    let claimed: OutboxRow | undefined;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Raw SQL only for the row lock (Prisma has no SKIP LOCKED). No user input.
          const rows = await tx.$queryRaw<OutboxRow[]>`
            SELECT id, type, payload, created_at AS "createdAt"
            FROM outbox_events
            WHERE published_at IS NULL AND attempts < ${maxAttempts}
            ORDER BY created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED`;
          if (rows.length === 0) return 'empty' as const;
          claimed = rows[0];
          await this.fanout.handle(
            {
              eventId: claimed.id,
              type: claimed.type as EventType,
              occurredAt: claimed.createdAt,
              data: claimed.payload as never,
            },
            tx,
          );
          await tx.outboxEvent.update({
            where: { id: claimed.id },
            data: { publishedAt: new Date() },
          });
          return 'done' as const;
        },
        { timeout: 15_000 },
      );
    } catch (err) {
      if (!claimed) throw err;
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.outboxEvent.update({
        where: { id: claimed.id },
        data: { attempts: { increment: 1 }, lastError: message.slice(0, 1000) },
      });
      this.logger.warn(`Event ${claimed.id} (${claimed.type}) failed: ${message}`);
      return 'failed';
    }
  }
}
