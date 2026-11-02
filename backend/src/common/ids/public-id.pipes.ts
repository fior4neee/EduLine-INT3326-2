import {
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiParam, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';
import { AppException } from '../errors/app.exception';
import { EntityKind, ID_PREFIX, parsePublicId } from './public-id';

@Injectable()
export class ParsePublicIdPipe implements PipeTransform<unknown, number> {
  constructor(private readonly kind: EntityKind) {}

  transform(value: unknown): number {
    const id = parsePublicId(this.kind, value);
    if (id === null) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'INVALID_ID',
        `Invalid ${this.kind} id. Use a number or ${ID_PREFIX[this.kind]}_<number>.`,
      );
    }
    return id;
  }
}

// Reads the raw string. A custom decorator (unlike @Param) is skipped by the
// global ValidationPipe, which would otherwise turn "crs_1234" into NaN first.
const RawRouteParam = createParamDecorator(
  (name: string, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<Request>().params[name],
);

// Route parameter holding a prefixed or bare numeric id: @IdParam('id', 'course').
export function IdParam(name: string, kind: EntityKind): ParameterDecorator {
  return (target, key, index) => {
    RawRouteParam(name, new ParsePublicIdPipe(kind))(target, key, index);
    if (key === undefined) return;
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor) {
      ApiParam({ name, type: String, example: `${ID_PREFIX[kind]}_1234` })(target, key, descriptor);
    }
  };
}

// DTO field holding a list of prefixed ids, e.g. ["crs_1010"]. Becomes number[].
export function PublicIdArray(kind: EntityKind, maxItems = 50): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ type: [String], example: [`${ID_PREFIX[kind]}_1010`] }),
    Transform(({ value }) =>
      Array.isArray(value) ? value.map((v) => parsePublicId(kind, v) ?? Number.NaN) : value,
    ),
    IsArray(),
    ArrayMaxSize(maxItems),
    IsInt({ each: true, message: `each value must be a ${kind} id like ${ID_PREFIX[kind]}_1234` }),
  );
}
