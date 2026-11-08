import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// The caller from the access token. Undefined only on @Public() routes called anonymously.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().user,
);
