import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionService } from './subscription.service.js';

@Injectable()
export class FreeTierRenewalCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async advanceExpiredFreeTierPeriods(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.subscription.findMany({
      where: { tier: 'FREE', currentPeriodEnd: { lte: now } },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });

    for (const row of expired) {
      let start = row.currentPeriodStart as Date;
      let end = row.currentPeriodEnd as Date;

      while (end <= now) {
        start = this.subscriptionService.addOneUtcMonth(start);
        end = this.subscriptionService.addOneUtcMonth(end);
      }

      await this.prisma.subscription.update({
        where: { id: row.id },
        data: { currentPeriodStart: start, currentPeriodEnd: end },
      });
    }
  }
}
