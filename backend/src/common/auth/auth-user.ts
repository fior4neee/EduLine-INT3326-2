import type { AccountType } from '@prisma/client';

// The caller, as read from a verified access token.
export interface AuthUser {
  id: string;
  accountType: AccountType;
  // familyId of the refresh token chain this login belongs to.
  sessionId: string;
}
