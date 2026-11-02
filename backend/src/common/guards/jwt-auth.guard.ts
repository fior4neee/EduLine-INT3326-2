import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AccessTokenService } from '../auth/access-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AppException } from '../errors/app.exception';

function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

// Global guard. Reads "Authorization: Bearer <token>" and sets req.user.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = bearerToken(req.headers.authorization);

    if (token) {
      const user = await this.accessTokens.verify(token);
      if (user) {
        req.user = user;
        return true;
      }
      // A bad token on a public route is treated as anonymous.
      if (isPublic) return true;
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN',
        'Access token is invalid or expired.',
      );
    }

    if (isPublic) return true;
    throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Authentication required.');
  }
}
