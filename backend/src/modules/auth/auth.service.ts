import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import type { EnvironmentVariables } from '../../common/config/env.validation';
import { PrismaService } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { MailService } from '../../common/mail/mail.service';
import { OutboxService } from '../../events/outbox.service';
import {
  burnHashTime,
  hashSecret,
  randomToken,
  sha256,
  verifySecret,
} from '../../common/security/hashing';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { toUserResponse, UserResponse } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { TokenPair, TokenService } from './token.service';

export interface SessionResponse extends TokenPair {
  user: UserResponse;
}

const MINUTE_MS = 60 * 1000;

const passwordReused = () =>
  new AppException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'PASSWORD_REUSED',
    'The new password must be different from the current one.',
  );

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly enrollments: EnrollmentsService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly outbox: OutboxService,
  ) {}

  // Always creates a Student. Choosing "Instructor" files a request for an Admin.
  async register(dto: RegisterDto): Promise<SessionResponse> {
    const [byUsername, byEmail] = await Promise.all([
      this.users.findByUsername(dto.username),
      this.users.findByEmail(dto.email),
    ]);
    if (byUsername) throw usernameTaken();
    if (byEmail) throw emailTaken();

    const wantsInstructor = dto.accountType === 'Instructor';
    const passwordHash = await hashSecret(dto.password);
    let user: User;
    try {
      // The account and its USER_REGISTERED event (→ welcome notification) commit together.
      user = await this.prisma.$transaction(async (tx) => {
        const created = await this.users.create(
          {
            username: dto.username,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            passwordHash,
            accountType: 'Student',
            ...(wantsInstructor && {
              instructorRequestStatus: 'Pending',
              instructorRequestedAt: new Date(),
            }),
          },
          tx,
        );
        await this.outbox.add(tx, 'USER_REGISTERED', {
          userId: created.id,
          requestedInstructor: wantsInstructor,
        });
        return created;
      });
    } catch (e) {
      // Lost a race with another registration using the same username or email.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = String(e.meta?.target ?? '');
        throw target.includes('email') ? emailTaken() : usernameTaken();
      }
      throw e;
    }
    return this.session(user, await this.tokens.startSession(user));
  }

  // Accepts a username or an email (usernames cannot contain "@").
  // Same error for an unknown account and a wrong password.
  async login(dto: LoginDto): Promise<SessionResponse> {
    const user = dto.username.includes('@')
      ? await this.users.findByEmail(dto.username)
      : await this.users.findByUsername(dto.username);
    if (!user) {
      await burnHashTime(dto.password);
      throw invalidCredentials();
    }
    if (!(await verifySecret(user.passwordHash, dto.password))) throw invalidCredentials();
    return this.session(user, await this.tokens.startSession(user));
  }

  async refresh(refreshToken: string): Promise<SessionResponse> {
    const { tokens, user } = await this.tokens.rotate(refreshToken);
    return this.session(user, tokens);
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.logout(refreshToken);
  }

  // Always looks the same to the caller, so it cannot be used to find out
  // which emails have accounts. Earlier unused links stop working.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;

    const token = randomToken();
    const ttlMinutes = this.config.get('PASSWORD_RESET_TTL_MINUTES', { infer: true });
    const expiresAt = new Date(Date.now() + ttlMinutes * MINUTE_MS);
    const resetUrl = new URL('/reset-password', this.config.get('FRONTEND_URL', { infer: true }));
    resetUrl.searchParams.set('token', token);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt },
      });
      await this.mail.sendPasswordReset(tx, {
        to: user.email,
        firstName: user.firstName,
        resetUrl: resetUrl.toString(),
        expiresAt,
      });
    });
  }

  // Single-use link. Ends every session, so a stolen session cannot outlive the reset.
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
      include: { user: true },
    });
    if (!row || row.usedAt || row.expiresAt <= new Date()) throw invalidResetToken();
    if (await verifySecret(row.user.passwordHash, dto.newPassword)) throw passwordReused();

    const passwordHash = await hashSecret(dto.newPassword);
    const done = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) return false;
      await this.users.setPasswordHash(tx, row.userId, passwordHash);
      await this.tokens.revokeAllForUser(tx, row.userId);
      return true;
    });
    if (!done) throw invalidResetToken();
  }

  // Must follow the password policy (DTO) and differ from the current password.
  // Other sessions are logged out; this one stays logged in.
  async changePassword(caller: AuthUser, dto: ChangePasswordDto): Promise<void> {
    const user = await this.users.getById(caller.id);
    if (!(await verifySecret(user.passwordHash, dto.currentPassword))) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'INVALID_CURRENT_PASSWORD',
        'The current password is wrong.',
      );
    }
    // currentPassword matched the stored hash, so equal strings mean reuse.
    if (dto.newPassword === dto.currentPassword) throw passwordReused();

    const passwordHash = await hashSecret(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await this.users.setPasswordHash(tx, user.id, passwordHash);
      await this.tokens.revokeAllForUser(tx, user.id, caller.sessionId);
    });
  }

  // User object with enrolledCourses, as returned by login and /users/me.
  async userResponse(user: User): Promise<UserResponse> {
    return toUserResponse(user, await this.enrollments.findSummariesForUser(user.id));
  }

  private async session(user: User, tokens: TokenPair): Promise<SessionResponse> {
    return { ...tokens, user: await this.userResponse(user) };
  }
}

function invalidCredentials() {
  return new AppException(
    HttpStatus.UNAUTHORIZED,
    'INVALID_CREDENTIALS',
    'Username or password is incorrect.',
  );
}

function invalidResetToken() {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'INVALID_RESET_TOKEN',
    'This reset link is invalid or has expired. Request a new one.',
  );
}

function usernameTaken() {
  return new AppException(HttpStatus.CONFLICT, 'USERNAME_TAKEN', 'This username is already taken.');
}

function emailTaken() {
  return new AppException(
    HttpStatus.CONFLICT,
    'EMAIL_TAKEN',
    'An account with this email already exists.',
  );
}
