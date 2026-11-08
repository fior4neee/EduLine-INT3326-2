import { HttpStatus, ValidationError } from '@nestjs/common';
import { AppException } from './app.exception';

interface FieldError {
  field: string;
  errors: string[];
}

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = e.constraints ? [{ field, errors: Object.values(e.constraints) }] : [];
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

// ValidationPipe errors → 400 VALIDATION_FAILED with one entry per field.
export function validationExceptionFactory(errors: ValidationError[]): AppException {
  return new AppException(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_FAILED',
    'Request validation failed.',
    flatten(errors),
  );
}
