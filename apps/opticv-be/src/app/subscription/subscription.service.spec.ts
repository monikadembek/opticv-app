import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service.js';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService],
    }).compile();

    service = module.get(SubscriptionService);
  });

  describe('addOneUtcMonth', () => {
    it('advances an ordinary mid-month date by exactly one calendar month', () => {
      const date = new Date(Date.UTC(2026, 2, 15, 10, 30, 0, 0)); // 2026-03-15
      const result = service.addOneUtcMonth(date);
      expect(result.toISOString()).toBe('2026-04-15T10:30:00.000Z');
    });

    it('rolls Jan 31 into March on a non-leap year (Date.UTC normalizes Feb 31)', () => {
      const date = new Date(Date.UTC(2026, 0, 31)); // 2026-01-31, non-leap
      const result = service.addOneUtcMonth(date);
      expect(result.toISOString()).toBe('2026-03-03T00:00:00.000Z');
    });

    it('rolls Jan 31 into March on a leap year (Date.UTC normalizes Feb 31)', () => {
      const date = new Date(Date.UTC(2024, 0, 31)); // 2024-01-31, leap year
      const result = service.addOneUtcMonth(date);
      expect(result.toISOString()).toBe('2024-03-02T00:00:00.000Z');
    });
  });

  describe('freeTierCycleFrom', () => {
    it('sets currentPeriodStart to the passed-in now and currentPeriodEnd to one month later', () => {
      const now = new Date(Date.UTC(2026, 5, 10, 8, 0, 0, 0));
      const result = service.freeTierCycleFrom(now);

      expect(result.currentPeriodStart).toBe(now);
      expect(result.currentPeriodEnd).toEqual(service.addOneUtcMonth(now));
    });

    it('uses new Date() as the default when no arg is passed', () => {
      jest.useFakeTimers();
      const fixedNow = new Date(Date.UTC(2026, 5, 10, 8, 0, 0, 0));
      jest.setSystemTime(fixedNow);

      const result = service.freeTierCycleFrom();

      expect(result.currentPeriodStart).toEqual(fixedNow);
      expect(result.currentPeriodEnd).toEqual(service.addOneUtcMonth(fixedNow));

      jest.useRealTimers();
    });
  });
});
