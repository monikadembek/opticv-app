import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class WebhookRecord {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  email!: string;
}

export class WebhookPayloadDto {
  @ApiProperty({ example: 'INSERT' })
  @IsString()
  type!: string;

  @ApiProperty({ type: () => WebhookRecord })
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookRecord)
  record!: WebhookRecord;
}
