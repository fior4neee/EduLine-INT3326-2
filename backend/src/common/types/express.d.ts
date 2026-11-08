import type { AuthUser } from '../auth/auth-user';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

export {};
