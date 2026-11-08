import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Tx } from '../common/database/prisma.service';
import type { EventPayloads, EventType } from './event-types';

// Fixed namespace for deterministic event ids (any constant UUID works).
const EVENT_ID_NAMESPACE = '6f1c2a8e-3b4d-4e5f-9a0b-1c2d3e4f5a6b';

// UUID version 5 (SHA-1, RFC 4122): the same name always gives the same id.
export function deterministicEventId(name: string): string {
  const ns = Buffer.from(EVENT_ID_NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(ns).update(name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Transactional outbox (ADR-005). Call add() inside the same transaction as the
// change, so the event is saved if and only if the change commits. The API's
// OutboxProcessor then handles it (notifications).
@Injectable()
export class OutboxService {
  async add<T extends EventType>(tx: Tx, type: T, data: EventPayloads[T]): Promise<void> {
    await tx.outboxEvent.create({ data: { type, payload: data as object } });
  }

  // For events that must happen at most once, e.g. one due-date reminder per
  // student: the id comes from `onceKey`, so writing it again is a no-op.
  // Returns true if the event is new.
  async addOnce<T extends EventType>(
    tx: Tx,
    onceKey: string,
    type: T,
    data: EventPayloads[T],
  ): Promise<boolean> {
    const created = await tx.outboxEvent.createMany({
      data: [{ id: deterministicEventId(`${type}:${onceKey}`), type, payload: data as object }],
      skipDuplicates: true,
    });
    return created.count === 1;
  }
}
