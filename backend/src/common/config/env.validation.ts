import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsString, IsUrl, Max, Min, MinLength, validateSync } from 'class-validator';
import { ConfigService } from '@nestjs/config';

// Every environment variable the API reads. The app refuses to start if one is
// missing or invalid, so a bad deploy fails fast instead of at the first request.
export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 8000;

  @IsString()
  @MinLength(1)
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(60)
  @Max(3600)
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @IsInt()
  @Min(1)
  @Max(90)
  REFRESH_TOKEN_TTL_DAYS: number = 7;

  @IsInt()
  @Min(5)
  @Max(1440)
  PASSWORD_RESET_TTL_MINUTES: number = 30;

  @IsString()
  CORS_ORIGINS: string = 'http://localhost:5173';

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string = 'http://localhost:5173';

  @IsInt()
  @Min(1)
  RATE_LIMIT_WINDOW_SECONDS: number = 60;

  @IsInt()
  @Min(1)
  RATE_LIMIT_MAX: number = 120;

  @IsInt()
  @Min(1)
  AUTH_RATE_LIMIT_MAX: number = 10;

  @IsIn(['console', 'outbox'])
  MAIL_TRANSPORT: 'console' | 'outbox' = 'console';

  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY_HOPS: number = 1;

  // Played by Video lessons that have no uploaded file yet, outside production
  // only. Empty disables it. Default: a public-domain clip from MDN.
  @IsString()
  DEV_SAMPLE_VIDEO_URL: string =
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';

  // How often the API handles outbox events (notifications). 0 turns the loop
  // off; integration tests do this and call the processor directly.
  @IsInt()
  @Min(0)
  @Max(60_000)
  OUTBOX_POLL_INTERVAL_MS: number = 2000;

  // After this many failures an event is skipped (see outbox_events.last_error).
  @IsInt()
  @Min(1)
  @Max(100)
  OUTBOX_MAX_ATTEMPTS: number = 5;

  // How often the API queues "assignment due within 24 h" reminders. 0 = off.
  @IsInt()
  @Min(0)
  @Max(86_400_000)
  ASSIGNMENT_REMINDER_INTERVAL_MS: number = 900_000;

  // Shared secret for /internal/* (Cloud Scheduler). Empty disables those routes.
  @IsString()
  INTERNAL_API_TOKEN: string = '';

  // Pub/Sub topic for outbox events (e.g. "notifications"). Set on Cloud Run: the
  // API publishes every event there and the worker handles it. Empty (local
  // development, tests): the API creates notifications itself.
  @IsString()
  PUBSUB_TOPIC: string = '';

  // File storage for lesson media and submissions:
  //   local = files under STORAGE_LOCAL_DIR, links served by this API (development)
  //   gcs   = Cloud Storage (M6; uploads answer 501 until implemented)
  // Empty picks gcs in production and local everywhere else.
  @IsIn(['', 'local', 'gcs'])
  STORAGE_DRIVER: '' | 'local' | 'gcs' = '';

  @IsString()
  STORAGE_LOCAL_DIR: string = 'uploads';

  // Base URL the browser uses to reach this API, for local storage links.
  // Empty = http://localhost:PORT/api/v1.
  @IsString()
  PUBLIC_API_URL: string = '';

  @IsString()
  STORAGE_MEDIA_BUCKET: string = 'eduline-media';

  @IsString()
  STORAGE_SUBMISSIONS_BUCKET: string = 'eduline-submissions';
}

export type AppConfigService = ConfigService<EnvironmentVariables, true>;

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const lines = errors.map(
      (e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
    );
    throw new Error(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'console') {
    throw new Error(
      'MAIL_TRANSPORT=console prints reset links to the log and is not allowed in production.',
    );
  }
  if (env.STORAGE_DRIVER === '') env.STORAGE_DRIVER = env.NODE_ENV === 'production' ? 'gcs' : 'local';
  if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER === 'local') {
    throw new Error(
      'STORAGE_DRIVER=local keeps files on the instance disk, which Cloud Run wipes; use gcs in production.',
    );
  }
  return env;
}
