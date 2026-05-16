import { IsInt, Max, Min } from 'class-validator';

export class UpdateAtsScoreDto {
  @IsInt()
  @Min(0)
  @Max(100)
  atsScore!: number;
}
