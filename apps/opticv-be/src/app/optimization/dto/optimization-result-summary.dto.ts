import { ApiProperty } from '@nestjs/swagger';
import { PromptType } from '../../../generated/prisma/enums.js';

export class OptimizationResultSummaryDto {
  @ApiProperty({ example: 'uuid-123' })
  id!: string;

  @ApiProperty({ enum: PromptType })
  promptType!: PromptType;

  @ApiProperty({ example: 'COMPLETED' })
  status!: string;

  @ApiProperty({ example: 'My edited output...', nullable: true })
  userEditedOutput!: string | null;
}
