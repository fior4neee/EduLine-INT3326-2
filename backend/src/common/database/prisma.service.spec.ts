import { PrismaService } from './prisma.service';

// docs/cloud-data-plan.md 5.7: with Cloud SQL stopped, the API must still start
// (and answer /health with 503) instead of crashing.
describe('PrismaService', () => {
  it('starts even when the database is unreachable', async () => {
    // Port 1 on localhost: nothing listens there, so the connection is refused at once.
    const prisma = new PrismaService({ datasources: { db: { url: 'postgresql://x:y@127.0.0.1:1/none' } } });
    await expect(prisma.onModuleInit()).resolves.toBeUndefined();
    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();
    await prisma.$disconnect();
  });
});
