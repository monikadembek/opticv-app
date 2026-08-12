import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubscriptionService } from './subscription.service.js';
import { FreeTierRenewalCron } from './free-tier-renewal.cron.js';

@Module({
  imports: [PrismaModule],
  providers: [SubscriptionService, FreeTierRenewalCron],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
