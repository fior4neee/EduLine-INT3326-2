// Creates the first Admin account (only an Admin can promote other accounts).
// Safe to run more than once: an existing account with that username is left as is.
// Usage: npm run seed   (reads SEED_ADMIN_* from backend/.env)
import { PrismaClient } from '@prisma/client';
import { hashSecret } from '../src/common/security/hashing';
import { PASSWORD_POLICY_MESSAGE, PASSWORD_REGEX } from '../src/modules/auth/password-policy';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in backend/.env`);
  return value;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const username = required('SEED_ADMIN_USERNAME').toLowerCase();
    const password = required('SEED_ADMIN_PASSWORD');
    if (!PASSWORD_REGEX.test(password))
      throw new Error(`SEED_ADMIN_PASSWORD: ${PASSWORD_POLICY_MESSAGE}`);

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      console.log(`User "${username}" already exists (${existing.accountType}). Nothing to do.`);
      return;
    }
    await prisma.user.create({
      data: {
        username,
        email: required('SEED_ADMIN_EMAIL').toLowerCase(),
        firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'EduLine',
        lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Admin',
        passwordHash: await hashSecret(password),
        accountType: 'Admin',
        isVerified: true,
      },
    });
    console.log(`Created Admin "${username}".`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
