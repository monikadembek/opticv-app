import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDisplayNameDto {
  @ApiProperty({ example: 'Jane Doe', maxLength: 100, minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(2)
  displayName!: string;
}
