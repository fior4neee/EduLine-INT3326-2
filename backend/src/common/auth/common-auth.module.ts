import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { EnvironmentVariables } from '../config/env.validation';
import { AccessTokenService } from './access-token.service';

const ISSUER = 'eduline-api';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
          issuer: ISSUER,
        },
        verifyOptions: { algorithms: ['HS256'], issuer: ISSUER },
      }),
    }),
  ],
  providers: [AccessTokenService],
  exports: [AccessTokenService],
})
export class CommonAuthModule {}
