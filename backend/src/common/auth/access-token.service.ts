import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountType } from '@prisma/client';
import type { AuthUser } from './auth-user';

interface AccessTokenPayload {
  sub: string;
  role: AccountType;
  sid: string;
}

const ROLES = new Set<string>(Object.values(AccountType));

// Signs and verifies the 15-minute access token. The role inside the token can
// be up to 15 minutes old after an Admin changes it; the next /auth/refresh
// reads the current role from the database.
@Injectable()
export class AccessTokenService {
  constructor(private readonly jwt: JwtService) {}

  sign(user: { id: string; accountType: AccountType }, sessionId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.accountType, sid: sessionId };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<AuthUser | null> {
    try {
      const p = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (typeof p.sub !== 'string' || typeof p.sid !== 'string' || !ROLES.has(p.role)) {
        return null;
      }
      return { id: p.sub, accountType: p.role, sessionId: p.sid };
    } catch {
      return null;
    }
  }
}
