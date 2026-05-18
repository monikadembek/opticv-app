import { ApiProperty } from '@nestjs/swagger';

export class RunIdResponseDto {
  @ApiProperty({ example: 'run-uuid-123' })
  runId!: string;
}
