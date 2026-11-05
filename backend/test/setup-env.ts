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
