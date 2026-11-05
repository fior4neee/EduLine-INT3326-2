import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { CommonAuthModule } from './common/auth/common-auth.module';
import { EnvironmentVariables, validateEnv } from './common/config/env.validation';
import { PrismaModule } from './common/database/prisma.module';
import { hasAuthRateLimit } from './common/decorators/auth-rate-limit.decorator';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { validationExceptionFactory } from './common/errors/validation-exception.factory';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { MailModule } from './common/mail/mail.module';
import { EventsModule } from './events/events.module';
import { AccessPolicyModule } from './modules/access/access-policy.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { CoursesModule } from './modules/courses/courses.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { HealthModule } from './modules/health/health.module';
import { ProgressModule } from './modules/progress/progress.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const ttl = seconds(config.get('RATE_LIMIT_WINDOW_SECONDS', { infer: true }));
        return {
          throttlers: [
            { name: 'default', ttl, limit: config.get('RATE_LIMIT_MAX', { infer: true }) },
            // Extra, stricter limit only on routes marked @AuthRateLimit().
            {
              name: 'auth',
              ttl,
              limit: config.get('AUTH_RATE_LIMIT_MAX', { infer: true }),
              skipIf: (ctx) => !hasAuthRateLimit(ctx),
            },
          ],
        };
      },
    }),

    // Shared, global
    PrismaModule,
    CommonAuthModule,
    EventsModule,
    MailModule,
    AccessPolicyModule,

    // Feature modules
    HealthModule,
    UsersModule,
    AuthModule,
    CoursesModule,
    EnrollmentsModule,
    ContentModule,
    ProgressModule,
    AnalyticsModule,
  ],
  providers: [
    // Order matters: authenticate, then check role, then rate limit per user.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          exceptionFactory: validationExceptionFactory,
        }),
    },
  ],
})
export class AppModule {}
