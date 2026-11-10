import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../common/config/env.validation';
import { PrismaService } from '../common/database/prisma.service';
import { NotificationFanoutService } from '../modules/notifications/notification-fanout.service';
import { EventPublisher } from './event-publisher.service';
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

// Delivers outbox events (docs/m2-plan.md §5): every few seconds it takes the
// oldest unhandled event and, in one transaction, either publishes it to Pub/Sub
// (when PUBSUB_TOPIC is set: the cloud, where the worker consumes it) or creates
// its notifications in-process (local development and tests), then marks it
// handled. "FOR UPDATE SKIP LOCKED" lets several API instances run this at once
// without handling the same event twice. A failing event is retried on later
// ticks, up to OUTBOX_MAX_ATTEMPTS, then left aside with its lastError so it
// cannot block the queue.
//
// If the commit fails after a successful publish, the event is published again
// on a later tick. Consumers dedupe by eventId (Pub/Sub is at-least-once anyway).
@Injectable()
export class OutboxProcessor implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('OutboxProcessor');
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fanout: NotificationFanoutService,
    private readonly publisher: EventPublisher,
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
          const event = {
            eventId: claimed.id,
            type: claimed.type as EventType,
            occurredAt: claimed.createdAt,
            data: claimed.payload as never,
          };
          if (this.publisher.enabled) await this.publisher.publish(event);
          else await this.fanout.handle(event, tx);
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
