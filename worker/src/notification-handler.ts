import 'reflect-metadata';
import { PrismaService } from '../../backend/src/common/database/prisma.service';
import { AccessPolicyService } from '../../backend/src/modules/access/access-policy.service';
import { NotificationFanoutService, OutboxEnvelope } from '../../backend/src/modules/notifications/notification-fanout.service';
import { NotificationsService } from '../../backend/src/modules/notifications/notifications.service';

// Instantiate only the existing services needed by fanout. No API bootstrap,
// outbox poller, reminder timer, controller, or user-auth configuration.
export function createNotificationHandler() {
  const prisma = new PrismaService({ log: [] });
  const notifications = new NotificationsService(prisma, new AccessPolicyService(prisma));
  const fanout = new NotificationFanoutService(notifications);
  return {
    prisma,
    handle(event: OutboxEnvelope): Promise<number> {
      return prisma.$transaction((tx) => fanout.handle(event, tx), {
        maxWait: 5_000,
        timeout: 15_000,
      });
    },
    async health(): Promise<void> {
      await prisma.$queryRaw`SELECT 1`;
    },
    async close(): Promise<void> {
      await prisma.$disconnect();
    },
  };
}
