import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { EnvironmentVariables } from '../config/env.validation';
import { AppException } from '../errors/app.exception';

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// For /internal/* routes called by Cloud Scheduler, not browsers. Requires the
// X-Internal-Token header to equal INTERNAL_API_TOKEN. When the token is not
// configured the routes answer 404, as if they did not exist.
@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get('INTERNAL_API_TOKEN', { infer: true });
    if (!expected) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found.');
    const token = ctx.switchToHttp().getRequest<Request>().header('x-internal-token');
    if (!token || !sameSecret(token, expected)) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Invalid internal token.');
    }
    return true;
  }
}
