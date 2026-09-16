import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SaveUserOutputDto {
  @ApiProperty({ example: 'My edited output text...' })
  @IsString()
  @MaxLength(50000)
  userEditedOutput!: string;
}
