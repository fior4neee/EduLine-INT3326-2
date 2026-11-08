import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const logger = new Logger('HTTP');
const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,100}$/;

// Gives every request an id (reused from X-Request-Id when valid), returns it in
// the response header, and writes one log line per request. The route pattern
// is logged instead of the URL, so ids, tokens and query strings never reach the logs.
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    logger.log({
      msg: 'request',
      requestId: req.requestId,
      userId: req.user?.id,
      method: req.method,
      route: req.route?.path ?? 'unmatched',
      status: res.statusCode,
      latencyMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
    });
  });
  next();
}
