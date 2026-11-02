import { HttpException, HttpStatus } from '@nestjs/common';

// Every error the API returns on purpose. The global filter turns it into
// { "error": { "code", "message", "details", "requestId" } }.
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super({ code, message, details }, status);
  }
}
