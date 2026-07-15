import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SubscriptionTier, SubscriptionStatus } from '@opticv/datatypes';

class SubscriptionDto {
  @ApiProperty({ enum: ['FREE', 'BASIC', 'PRO'] })
  tier!: SubscriptionTier;

  @ApiProperty({ enum: ['ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIALING'] })
  status!: SubscriptionStatus;
}

class NotificationPreferencesDto {
  @ApiProperty()
  productUpdatesEnabled!: boolean;

  @ApiProperty()
  weeklyTipsEnabled!: boolean;
}

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ type: SubscriptionDto, nullable: true })
  subscription!: SubscriptionDto | null;

  @ApiProperty({ type: NotificationPreferencesDto })
  notifications!: NotificationPreferencesDto;
}
