import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class JobApplicationQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
