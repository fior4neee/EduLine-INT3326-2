import { copyFile, cp, mkdir } from 'node:fs/promises';

// Keep the original schema/migrations read-only. Generate into worker/node_modules,
// never backend/node_modules; build/ is already ignored by the root .gitignore.
const source = new URL('../../backend/prisma/', import.meta.url);
const target = new URL('../build/prisma/', import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(new URL('schema.prisma', source), new URL('schema.prisma', target));
await cp(new URL('migrations', source), new URL('migrations', target), { recursive: true });
