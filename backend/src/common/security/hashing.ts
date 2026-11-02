import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

// OWASP minimum for argon2id: 19 MiB memory, 2 iterations, 1 lane.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

// For user passwords and course passwords. One-way: cannot be reversed.
export function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

// Used when the username does not exist, so a failed login takes the same
// time either way and does not reveal which usernames exist.
let dummyHash: Promise<string> | undefined;
export async function burnHashTime(plain: string): Promise<void> {
  dummyHash ??= hashSecret('dummy-password-for-timing');
  await verifySecret(await dummyHash, plain);
}

// For refresh and reset tokens: random 256-bit values, stored only as SHA-256.
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
