import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import type { OutboxEnvelope } from '../../backend/src/modules/notifications/notification-fanout.service';
import { parsePushMessage, PushMessageError } from './push-message';

export interface WorkerDependencies {
  handle(event: OutboxEnvelope): Promise<number>;
  health(): Promise<void>;
  logger?: (entry: Record<string, unknown>) => void;
}

// These events contain IDs/scalars, not uploaded files. Bound memory before parsing.
const MAX_BODY_BYTES = 1024 * 1024;

class BodyError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        if (!tooLarge) {
          tooLarge = true;
          chunks.length = 0;
          reject(new BodyError(413, 'MESSAGE_TOO_LARGE'));
        }
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new BodyError(400, 'MALFORMED_MESSAGE')); }
    });
    req.on('error', () => reject(new BodyError(400, 'INCOMPLETE_REQUEST')));
    req.on('aborted', () => reject(new BodyError(400, 'INCOMPLETE_REQUEST')));
  });
}

function json(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export function createWorkerServer(deps: WorkerDependencies) {
  const log = deps.logger ?? ((entry) => console.log(JSON.stringify(entry)));
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      try {
        await deps.health();
        json(res, 200, { status: 'ok', database: 'up' });
      } catch {
        json(res, 503, { error: 'DATABASE_UNAVAILABLE' });
      }
      return;
    }
    if (req.url !== '/pubsub/notifications' || req.method !== 'POST') {
      req.resume();
      json(res, 404, { error: 'NOT_FOUND' });
      return;
    }
    if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      req.resume();
      json(res, 415, { error: 'JSON_REQUIRED' });
      return;
    }

    let context: Record<string, unknown> = {};
    try {
      const { event, messageId } = parsePushMessage(await readJson(req));
      context = { eventId: event.eventId, type: event.type, messageId };
      const created = await deps.handle(event);
      // handle resolves only after the DB transaction commits, including duplicates.
      log({ severity: 'INFO', result: 'handled', ...context, created });
      res.writeHead(204);
      res.end();
    } catch (error) {
      const status = error instanceof BodyError ? error.status
        : error instanceof PushMessageError ? (error.code === 'UNSUPPORTED_EVENT' ? 422 : 400)
        : 503;
      const code = error instanceof BodyError || error instanceof PushMessageError
        ? error.code : 'PROCESSING_FAILED';
      // No raw payloads, email addresses, reset URLs, credentials, or DB error text.
      log({ severity: 'ERROR', result: 'rejected', ...context, code });
      json(res, status, { error: code });
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  return server;
}
