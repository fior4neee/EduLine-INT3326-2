import { ExecutionContext, SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_KEY = 'authRateLimit';

// Applies the stricter AUTH_RATE_LIMIT_MAX limit on top of the default one.
// Use on routes that check a password or send email.
export const AuthRateLimit = () => SetMetadata(AUTH_RATE_LIMIT_KEY, true);

export function hasAuthRateLimit(ctx: ExecutionContext): boolean {
  return Reflect.getMetadata(AUTH_RATE_LIMIT_KEY, ctx.getHandler()) === true;
}
