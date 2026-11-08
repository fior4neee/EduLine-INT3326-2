import { HttpStatus, Injectable } from '@nestjs/common';
import { AccountType, Prisma, User } from '@prisma/client';
import type { AuthUser } from '../../common/auth/auth-user';
import { PrismaService, Tx } from '../../common/database/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { paginated, Paginated, skipTake } from '../../common/pagination/pagination';
import { OutboxService } from '../../events/outbox.service';
import { AdminUsersQueryDto } from './dto/admin-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const userNotFound = () =>
  new AppException(HttpStatus.NOT_FOUND, 'USER_NOT_FOUND', 'User not found.');

// Owns the users table. Other modules read and write users only through here.
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw userNotFound();
    return user;
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findSummaries(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, firstName: true, lastName: true, email: true },
    });
  }

  create(data: Prisma.UserCreateInput, tx: Tx = this.prisma): Promise<User> {
    return tx.user.create({ data });
  }

  async setPasswordHash(tx: Tx, userId: string, passwordHash: string): Promise<void> {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName, description: dto.description },
    });
  }

  // A Student asks to become an Instructor (again, if an earlier request was rejected).
  async requestInstructorRole(userId: string): Promise<User> {
    const user = await this.getById(userId);
    if (user.accountType !== 'Student') {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'NOT_A_STUDENT',
        'Only Student accounts can ask to become an Instructor.',
      );
    }
    if (user.instructorRequestStatus === 'Pending') {
      throw new AppException(
        HttpStatus.CONFLICT,
        'REQUEST_ALREADY_PENDING',
        'Your instructor request is already waiting for an Admin.',
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { instructorRequestStatus: 'Pending', instructorRequestedAt: new Date() },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async list(query: AdminUsersQueryDto): Promise<Paginated<User>> {
    const where: Prisma.UserWhereInput = {
      accountType: query.accountType,
      instructorRequestStatus: query.instructorRequestStatus,
      ...(query.q && {
        OR: ['username', 'email', 'firstName', 'lastName'].map((field) => ({
          [field]: { contains: query.q, mode: 'insensitive' },
        })),
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: query.instructorRequestStatus
          ? { instructorRequestedAt: 'asc' }
          : { createdAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows, total, query);
  }

  async setAccountType(admin: AuthUser, userId: string, accountType: AccountType): Promise<User> {
    if (admin.id === userId) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CANNOT_CHANGE_OWN_ROLE',
        'Admins cannot change their own account type.',
      );
    }
    const user = await this.getById(userId);
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        accountType,
        // Promoting someone with a pending request also settles the request.
        ...(user.instructorRequestStatus === 'Pending' &&
          accountType !== 'Student' && { instructorRequestStatus: 'Approved' }),
      },
    });
  }

  // Approve: the account becomes an Instructor. Reject: it stays a Student.
  async decideInstructorRequest(userId: string, approve: boolean): Promise<User> {
    const decision = approve ? 'Approved' : 'Rejected';
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, instructorRequestStatus: 'Pending' },
        data: {
          instructorRequestStatus: decision,
          ...(approve && { accountType: 'Instructor' }),
        },
      });
      if (updated.count === 0) {
        if (!(await tx.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
          throw userNotFound();
        }
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'NO_PENDING_REQUEST',
          'This user has no pending instructor request.',
        );
      }
      await this.outbox.add(tx, 'INSTRUCTOR_REQUEST_DECIDED', { userId, decision });
      return tx.user.findUniqueOrThrow({ where: { id: userId } });
    });
  }
}
