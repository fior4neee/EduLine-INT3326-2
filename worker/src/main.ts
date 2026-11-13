import { createNotificationHandler } from './notification-handler';
import { createWorkerServer } from './server';

const port = Number(process.env.PORT ?? '8080');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const handler = createNotificationHandler();
const server = createWorkerServer(handler);
// Cloud Run IAM authenticates production requests before they reach this server.
// Direct local runs bind loopback; Docker sets HOST and publishes to loopback.
const host = process.env.HOST ?? (process.env.K_SERVICE ? '0.0.0.0' : '127.0.0.1');
server.listen(port, host, () => {
  console.log(JSON.stringify({ severity: 'INFO', result: 'listening', port, host }));
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    void handler.close().then(() => process.exit(0), () => process.exit(1));
  });
  // Cloud Run grants a short shutdown window; unacknowledged messages are retried.
  setTimeout(() => process.exit(1), 8_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
