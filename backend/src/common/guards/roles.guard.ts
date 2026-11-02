import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AccountType } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AppException } from '../errors/app.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AccountType[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const user = ctx.switchToHttp().getRequest<Request>().user;
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHENTICATED',
        'Authentication required.',
      );
    }
    if (!roles.includes(user.accountType)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN_ROLE',
        'Your account type cannot do this.',
      );
    }
    return true;
  }
}
