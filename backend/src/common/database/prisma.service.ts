import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  // Connect early when the database is up, but do not fail startup when it is not
  // (Cloud SQL stopped or still starting): Prisma connects on the first query, so
  // the API starts, /health answers 503 DATABASE_UNAVAILABLE, and it recovers by
  // itself once the database is back. Crashing here made Cloud Run return its own
  // 500/503 pages until a new container happened to start.
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      const message = err instanceof Error ? err.message.split('\n')[0] : String(err);
      this.logger.warn(`Database not reachable at startup, will retry on first query: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
