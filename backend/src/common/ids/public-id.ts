// The database stores plain integers. The API shows them with a prefix,
// for example course 1234 is "crs_1234". URLs and request bodies accept
// either "crs_1234" or "1234".

export const ID_PREFIX = {
  course: 'crs',
  enrollment: 'enr',
  module: 'mod',
  lesson: 'les',
  quiz: 'qz',
  question: 'qst',
  attempt: 'att',
  assignment: 'asg',
  submission: 'sub',
  notification: 'ntf',
} as const;

export type EntityKind = keyof typeof ID_PREFIX;

// PostgreSQL "integer" upper bound. Larger values would make Prisma throw.
const MAX_DB_INT = 2_147_483_647;

export function toPublicId(kind: EntityKind, id: number): string {
  return `${ID_PREFIX[kind]}_${id}`;
}

// "crs_1234", "1234" or 1234 → 1234. Anything else → null.
export function parsePublicId(kind: EntityKind, value: unknown): number | null {
  let raw: string;
  if (typeof value === 'number') {
    raw = String(value);
  } else if (typeof value === 'string') {
    const prefix = `${ID_PREFIX[kind]}_`;
    raw = value.startsWith(prefix) ? value.slice(prefix.length) : value;
  } else {
    return null;
  }

  if (!/^\d{1,10}$/.test(raw)) return null;
  const id = Number(raw);
  return id >= 1 && id <= MAX_DB_INT ? id : null;
}
