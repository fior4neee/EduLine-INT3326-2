import { ConsoleLogger, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { EnvironmentVariables } from './common/config/env.validation';
import { requestContext } from './common/logging/request-context.middleware';

export const API_PREFIX = 'api/v1';

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // JSON lines in production, which Cloud Logging parses into fields.
    logger: isProduction ? new ConsoleLogger({ json: true }) : undefined,
  });
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Behind the load balancer and Cloud Run, so req.ip reads X-Forwarded-For.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));
  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(
    helmet({
      contentSecurityPolicy: {
        // Loose enough for the Swagger UI page; API responses are JSON.
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 3600,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('EduLine API')
      .setDescription(
        'Errors: { "error": { code, message, details, requestId } }. Lists: { data, meta }.',
      )
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `EduLine API on http://localhost:${port}/${API_PREFIX} (docs: /api/docs)`,
  );
}

void bootstrap();
