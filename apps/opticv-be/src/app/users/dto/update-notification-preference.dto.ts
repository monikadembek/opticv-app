import { IsBoolean, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { NotificationType } from '@opticv/datatypes';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: ['PRODUCT_UPDATES', 'WEEKLY_TIPS'] })
  @IsIn(['PRODUCT_UPDATES', 'WEEKLY_TIPS'])
  type!: NotificationType;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
