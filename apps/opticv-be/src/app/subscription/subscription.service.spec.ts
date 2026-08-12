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

  describe('freeTierCycleFrom', () => {
    it('sets currentPeriodStart to the passed-in now and currentPeriodEnd to null (FREE never renews)', () => {
      const now = new Date(Date.UTC(2026, 5, 10, 8, 0, 0, 0));
      const result = service.freeTierCycleFrom(now);

      expect(result.currentPeriodStart).toBe(now);
      expect(result.currentPeriodEnd).toBeNull();
    });

    it('uses new Date() as the default when no arg is passed', () => {
      jest.useFakeTimers();
      const fixedNow = new Date(Date.UTC(2026, 5, 10, 8, 0, 0, 0));
      jest.setSystemTime(fixedNow);

      const result = service.freeTierCycleFrom();

      expect(result.currentPeriodStart).toEqual(fixedNow);
      expect(result.currentPeriodEnd).toBeNull();

      jest.useRealTimers();
    });
  });
});
