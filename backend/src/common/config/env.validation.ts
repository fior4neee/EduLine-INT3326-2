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
  return env;
}
