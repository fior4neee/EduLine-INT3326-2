import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../common/database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { AppException } from '../../common/errors/app.exception';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Used by the frontend smoke test, Cloud Run and uptime checks. Reads the database.
  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'DATABASE_UNAVAILABLE',
        'Database is not reachable.',
      );
    }
    return { status: 'ok', database: 'up' };
  }
}
