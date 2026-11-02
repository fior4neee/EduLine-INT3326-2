import { Injectable } from '@nestjs/common';
import type { Tx } from '../common/database/prisma.service';
import type { EventPayloads, EventType } from './event-types';

// Transactional outbox (ADR-005). Call add() inside the same transaction as the
// change, so the event is saved if and only if the change commits. Publishing
// to Pub/Sub is done later by a relay (week 7); until then rows simply wait.
@Injectable()
export class OutboxService {
  async add<T extends EventType>(tx: Tx, type: T, data: EventPayloads[T]): Promise<void> {
    await tx.outboxEvent.create({ data: { type, payload: data as object } });
  }
}
