import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
  addOneUtcMonth(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        date.getUTCMilliseconds(),
      ),
    );
  }

  freeTierCycleFrom(now: Date = new Date()): {
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  } {
    return {
      currentPeriodStart: now,
      currentPeriodEnd: this.addOneUtcMonth(now),
    };
  }
}
