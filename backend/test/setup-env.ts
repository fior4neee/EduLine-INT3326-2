// Runs before every integration test file. Integration tests truncate every table,
// so refuse to start unless the database is clearly a throwaway one.
const url = process.env.DATABASE_URL ?? '';
const dbName = url.split('?')[0].split('/').pop() ?? '';
if (!dbName.endsWith('_test')) {
  throw new Error(
    `Refusing to run: DATABASE_URL must point at a database whose name ends in "_test" (got "${dbName}").`,
  );
}

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'integration-test-secret-at-least-32-characters';
process.env.RATE_LIMIT_MAX = '1000000';
process.env.AUTH_RATE_LIMIT_MAX = '1000000';
// Tests call OutboxProcessor.processPending() themselves.
process.env.OUTBOX_POLL_INTERVAL_MS = '0';
process.env.ASSIGNMENT_REMINDER_INTERVAL_MS = '0';
// Uploaded test files go to a temporary folder, never into backend/uploads.
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = require('node:path').join(require('node:os').tmpdir(), 'eduline-test-uploads');
// Events are handled in-process; Pub/Sub publishing is tested with a fake publisher.
process.env.PUBSUB_TOPIC = '';
