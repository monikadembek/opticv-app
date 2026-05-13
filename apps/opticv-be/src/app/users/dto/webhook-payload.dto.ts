import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookRecord {
  @IsString()
  id!: string;

  @IsString()
  email!: string;
}

export class WebhookPayloadDto {
  @IsString()
  type!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookRecord)
  record!: WebhookRecord;
}
