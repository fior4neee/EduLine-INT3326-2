import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export function skipTake(q: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (q.page - 1) * q.pageSize, take: q.pageSize };
}

export function paginated<T>(data: T[], total: number, q: PaginationQueryDto): Paginated<T> {
  return { data, meta: { page: q.page, pageSize: q.pageSize, total } };
}
