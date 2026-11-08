import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Counts requests per logged-in user, or per IP when anonymous. Per user
// matters for the load test, where hundreds of students share one IP.
// Counters live in memory per Cloud Run instance, which is enough for now.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  }
}
