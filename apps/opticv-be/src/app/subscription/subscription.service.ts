import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
  freeTierCycleFrom(now: Date = new Date()): {
    currentPeriodStart: Date;
    currentPeriodEnd: null;
  } {
    return {
      currentPeriodStart: now,
      currentPeriodEnd: null,
    };
  }
}
