import { ApiProperty } from '@nestjs/swagger';

export class RunIdResponseDto {
  @ApiProperty({ example: 'run-uuid-123' })
  runId!: string;
}

export class SaveUserOutputResponseDto {
  @ApiProperty({ example: 'My edited output text...' })
  userEditedOutput!: string;
}
