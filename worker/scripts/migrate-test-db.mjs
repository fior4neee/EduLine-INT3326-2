import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import './prepare-prisma.mjs';

// Applies the existing migrations only to an explicitly named local test DB.
const url = new URL(process.env.DATABASE_URL ?? 'file:///missing');
if (!['postgres:', 'postgresql:'].includes(url.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  || !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname)
  || url.searchParams.has('host')) {
  throw new Error('DATABASE_URL must point to a local PostgreSQL database ending in _test.');
}
const result = spawnSync(process.execPath, [
  fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)),
  'migrate', 'deploy', '--schema', 'build/prisma/schema.prisma',
], { cwd: new URL('../', import.meta.url), stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
