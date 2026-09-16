import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({ enum: ['BASIC', 'PRO'] })
  @IsIn(['BASIC', 'PRO'])
  tier!: 'BASIC' | 'PRO';
}
