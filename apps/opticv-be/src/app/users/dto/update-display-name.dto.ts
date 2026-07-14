import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDisplayNameDto {
  @ApiProperty({ example: 'Jane Doe', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName!: string;
}
