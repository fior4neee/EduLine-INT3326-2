import { SetMetadata } from '@nestjs/common';
import type { AccountType } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Restricts a route to some account types. This is only the first check:
// course resources also go through AccessPolicyService.
export const Roles = (...roles: AccountType[]) => SetMetadata(ROLES_KEY, roles);
