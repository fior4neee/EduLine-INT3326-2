import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { AppException } from './app.exception';

interface ErrorBody {
  status: number;
  code: string;
  message: string;
  details: unknown[];
}

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'BUSINESS_RULE_VIOLATION',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

// Turns every thrown error into the shared error shape. Stack traces and
// database details are logged, never sent to the client.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const body = this.toErrorBody(exception);

    if (body.status >= 500) {
      this.logger.error(
        { msg: 'Unhandled error', requestId: req.requestId, path: req.path },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(body.status).json({
      error: {
        code: body.code,
        message: body.message,
        details: body.details,
        requestId: req.requestId,
      },
    });
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests. Try again later.',
        details: [],
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      let message = exception.message;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const m = (response as { message: unknown }).message;
        message = Array.isArray(m) ? m.join('; ') : String(m);
      }
      return { status, code: DEFAULT_CODES[status] ?? 'ERROR', message, details: [] };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: 409,
            code: 'CONFLICT',
            message: 'A record with the same unique value already exists.',
            details: [{ fields: exception.meta?.target ?? null }],
          };
        case 'P2025':
          return { status: 404, code: 'NOT_FOUND', message: 'Record not found.', details: [] };
        case 'P2003':
          return {
            status: 409,
            code: 'CONFLICT',
            message: 'A related record does not exist.',
            details: [],
          };
        case 'P2024':
          return {
            status: 503,
            code: 'SERVICE_UNAVAILABLE',
            message: 'The server is busy. Try again.',
            details: [],
          };
      }
    }

    // Errors raised by Express middleware, e.g. malformed JSON from body-parser.
    const status = (exception as { status?: unknown } | null)?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      if ((exception as { type?: unknown }).type === 'entity.parse.failed') {
        return {
          status: 400,
          code: 'INVALID_JSON',
          message: 'Request body is not valid JSON.',
          details: [],
        };
      }
      return {
        status,
        code: DEFAULT_CODES[status] ?? 'BAD_REQUEST',
        message: 'Bad request.',
        details: [],
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
      details: [],
    };
  }
}
