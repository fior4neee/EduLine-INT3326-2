import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, type Topic } from '@google-cloud/pubsub';
import type { EnvironmentVariables } from '../common/config/env.validation';
import type { EventType } from './event-types';

export interface PublishedEvent {
  eventId: string;
  type: EventType | string;
  occurredAt: Date;
  data: unknown;
}

// Sends outbox events to Pub/Sub (ADR-005, docs/cloud-data-plan.md 7.2). Enabled
// only when PUBSUB_TOPIC is set, which the Cloud Run deploy does; local
// development and tests have no Pub/Sub, so the API handles events in-process.
//
// Message contract for consumers (the worker, M6):
//   data:       JSON {eventId, type, occurredAt, data}, the same envelope as in-process
//   attributes: {eventId, type}, so a subscription can filter by type
// Delivery is at least once: consumers must ignore an eventId they already handled.
@Injectable()
export class EventPublisher implements OnModuleDestroy {
  private readonly logger = new Logger('EventPublisher');
  private readonly topic?: Topic;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const name = config.get('PUBSUB_TOPIC', { infer: true });
    if (!name) return;
    // Project and credentials come from the environment (Cloud Run's service
    // account, or `gcloud auth application-default login` on a laptop).
    this.topic = new PubSub().topic(name, { batching: { maxMessages: 1 } });
    this.logger.log(`Outbox events go to Pub/Sub topic "${name}"`);
  }

  get enabled(): boolean {
    return this.topic !== undefined;
  }

  // Resolves once Pub/Sub has stored the message; rejects otherwise, so the
  // processor leaves the event unpublished and retries it.
  async publish(event: PublishedEvent): Promise<string> {
    if (!this.topic) throw new Error('PUBSUB_TOPIC is not set');
    return this.topic.publishMessage({
      json: {
        eventId: event.eventId,
        type: event.type,
        occurredAt: event.occurredAt.toISOString(),
        data: event.data,
      },
      attributes: { eventId: event.eventId, type: String(event.type) },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.topic?.flush();
  }
}
