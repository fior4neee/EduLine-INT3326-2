import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/database/prisma.service';
import { EventPublisher, PublishedEvent } from '../src/events/event-publisher.service';
import { OutboxProcessor } from '../src/events/outbox-processor.service';
import { enroll, makeCourse, makeUser, resetDatabase } from './helpers/app';

// With PUBSUB_TOPIC set (the cloud), outbox events go to Pub/Sub instead of being
// handled in-process (docs/cloud-data-plan.md 7.2). Pub/Sub itself is faked.
describe('outbox → Pub/Sub', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let outbox: OutboxProcessor;
  let published: PublishedEvent[];
  let failNext: boolean;

  beforeAll(async () => {
    const fake = {
      enabled: true,
      publish: async (e: PublishedEvent) => {
        if (failNext) {
          failNext = false;
          throw new Error('Pub/Sub unavailable');
        }
        published.push(e);
        return `msg-${published.length}`;
      },
    };
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EventPublisher)
      .useValue(fake)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    outbox = app.get(OutboxProcessor);
  });
  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    published = [];
    failNext = false;
  });

  const addEvent = async () => {
    const instructor = await makeUser(prisma, 'Instructor');
    const student = await makeUser(prisma);
    const { course } = await makeCourse(prisma, instructor, ['Text']);
    await prisma.course.update({ where: { id: course.id }, data: { welcomeMessage: 'Chào mừng!' } });
    await enroll(prisma, student, course.id);
    return prisma.outboxEvent.create({
      data: { type: 'ENROLLMENT_CREATED', payload: { userId: student.id, courseId: `crs_${course.id}` } },
    });
  };

  it('PS01: an event is published, marked handled, and creates no notification in the API', async () => {
    const event = await addEvent();
    expect(await outbox.processPending()).toEqual({ processed: 1, failed: 0 });

    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({ eventId: event.id, type: 'ENROLLMENT_CREATED' });
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).publishedAt).not.toBeNull();
    expect(await prisma.notification.count()).toBe(0);
  });

  it('PS02: when publishing fails, the event stays unpublished and is retried', async () => {
    const event = await addEvent();
    failNext = true;
    expect(await outbox.processPending()).toEqual({ processed: 0, failed: 1 });
    const after = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(after).toMatchObject({ publishedAt: null, attempts: 1, lastError: 'Pub/Sub unavailable' });

    expect(await outbox.processPending()).toEqual({ processed: 1, failed: 0 });
    expect(published.map((e) => e.eventId)).toEqual([event.id]);
  });
});
