import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '../../events/outbox.service';
import type { EnvironmentVariables } from '../config/env.validation';
import type { Tx } from '../database/prisma.service';

export interface PasswordResetMail {
  to: string;
  firstName: string;
  resetUrl: string;
  expiresAt: Date;
}

// The API never talks to an email provider directly (ADR-005).
//   outbox:  writes EMAIL_REQUESTED in the caller's transaction; the worker sends it.
//   console: prints the email to the log. Development only; refused in production
//            by env validation, because the log line contains the reset link.
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly outbox: OutboxService,
  ) {}

  async sendPasswordReset(tx: Tx, mail: PasswordResetMail): Promise<void> {
    if (this.config.get('MAIL_TRANSPORT', { infer: true }) === 'outbox') {
      await this.outbox.add(tx, 'EMAIL_REQUESTED', {
        to: mail.to,
        template: 'password-reset',
        data: {
          firstName: mail.firstName,
          resetUrl: mail.resetUrl,
          expiresAt: mail.expiresAt.toISOString(),
        },
      });
      return;
    }
    this.logger.warn(`[dev mail] Password reset for ${mail.to}: ${mail.resetUrl}`);
  }
}
