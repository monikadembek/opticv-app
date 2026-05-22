import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SaveUserOutputDto {
  @ApiProperty({ example: 'My edited output text...' })
  @IsString()
  userEditedOutput!: string;
}
