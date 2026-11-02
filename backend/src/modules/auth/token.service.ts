import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AccessTokenService } from '../../common/auth/access-token.service';
import type { EnvironmentVariables } from '../../common/config/env.validation';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { randomToken, sha256 } from '../../common/security/hashing';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const unauthorized = (code: string, message: string) =>
  new AppException(HttpStatus.UNAUTHORIZED, code, message);

// Refresh token rotation (backend README §2). Every login starts a "family".
// Each refresh revokes the token it was given and issues a new one in the same
// family. Using a revoked token again means it was copied, so the whole family
// is revoked and that login session ends everywhere.
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokens: AccessTokenService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  startSession(user: User): Promise<TokenPair> {
    return this.issuePair(this.prisma, user, randomUUID());
  }

  async rotate(rawRefreshToken: string): Promise<{ tokens: TokenPair; user: User }> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefreshToken) },
      include: { user: true },
    });
    if (!existing) {
      throw unauthorized('INVALID_REFRESH_TOKEN', 'Refresh token is invalid.');
    }
    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw unauthorized('REFRESH_TOKEN_REUSED', 'This session has ended. Please log in again.');
    }
    if (existing.expiresAt <= new Date()) {
      throw unauthorized('REFRESH_TOKEN_EXPIRED', 'Your session has expired. Please log in again.');
    }

    const tokens = await this.prisma.$transaction(async (tx) => {
      // Only one concurrent request can revoke this token; the loser is treated as reuse.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (claimed.count === 0) return null;
      return this.issuePair(tx, existing.user, existing.familyId);
    });

    if (!tokens) {
      await this.revokeFamily(existing.familyId);
      throw unauthorized('REFRESH_TOKEN_REUSED', 'This session has ended. Please log in again.');
    }
    return { tokens, user: existing.user };
  }

  // Ends the login session the token belongs to. Unknown tokens are ignored.
  async logout(rawRefreshToken: string): Promise<void> {
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefreshToken) },
      select: { familyId: true },
    });
    if (existing) await this.revokeFamily(existing.familyId);
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // Ends every session of a user, optionally keeping the current one.
  async revokeAllForUser(tx: Tx, userId: string, keepFamilyId?: string): Promise<void> {
    await tx.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepFamilyId && { familyId: { not: keepFamilyId } }),
      },
      data: { revokedAt: new Date() },
    });
  }

  private async issuePair(tx: Tx, user: User, familyId: string): Promise<TokenPair> {
    const refreshToken = randomToken();
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
      },
    });
    const accessToken = await this.accessTokens.sign(user, familyId);
    return { accessToken, refreshToken };
  }
}
