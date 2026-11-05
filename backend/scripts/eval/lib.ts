// Shared by the eval scripts. Run them with ts-node, e.g.
//   npx ts-node --transpile-only scripts/eval/scoring-vmlu.ts

// Small seeded PRNG so a run can be repeated exactly.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export class Report {
  private checks: Check[] = [];
  add(name: string, ok: boolean, detail: string): void {
    this.checks.push({ name, ok, detail });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
  }
  finish(): never {
    const failed = this.checks.filter((c) => !c.ok);
    console.log(
      failed.length === 0 ? 'PASS' : `FAIL (${failed.length} of ${this.checks.length} checks)`,
    );
    process.exit(failed.length === 0 ? 0 : 1);
  }
}

// Evals that touch the database empty it first, so insist on a throwaway one.
export function requireTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  const name = url.split('?')[0].split('/').pop() ?? '';
  if (!name.endsWith('_test')) {
    console.error(
      `Refusing to run: DATABASE_URL must name a database ending in "_test" (got "${name}").`,
    );
    process.exit(2);
  }
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'eval-secret-at-least-32-characters-long';
}
