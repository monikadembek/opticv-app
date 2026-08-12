import { Test, TestingModule } from '@nestjs/testing';
import { FreeTierRenewalCron } from './free-tier-renewal.cron.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionService } from './subscription.service.js';

const mockPrisma = {
  subscription: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('FreeTierRenewalCron', () => {
  let cron: FreeTierRenewalCron;
  let subscriptionService: SubscriptionService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeTierRenewalCron,
        SubscriptionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    cron = module.get(FreeTierRenewalCron);
    subscriptionService = module.get(SubscriptionService);
  });

  it('does not call update when there are no expired rows', async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await cron.advanceExpiredFreeTierPeriods();

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
      where: { tier: 'FREE', currentPeriodEnd: { lte: expect.any(Date) } },
      select: { id: true, currentPeriodStart: true, currentPeriodEnd: true },
    });
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
  });

  it('advances a single expired row exactly one month past its original end', async () => {
    const now = new Date();
    const originalStart = new Date(now);
    originalStart.setUTCMonth(originalStart.getUTCMonth() - 1);
    const originalEnd = new Date(now);
    originalEnd.setUTCDate(originalEnd.getUTCDate() - 1); // expired, but less than a month ago

    mockPrisma.subscription.findMany.mockResolvedValue([
      { id: 'sub-1', currentPeriodStart: originalStart, currentPeriodEnd: originalEnd },
    ]);

    await cron.advanceExpiredFreeTierPeriods();

    const expectedStart = subscriptionService.addOneUtcMonth(originalStart);
    const expectedEnd = subscriptionService.addOneUtcMonth(originalEnd);

    expect(mockPrisma.subscription.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { currentPeriodStart: expectedStart, currentPeriodEnd: expectedEnd },
    });
  });

  it('rolls a row inactive for 3+ months through multiple cycles until end is in the future', async () => {
    const now = new Date();
    const fourMonthsAgoStart = new Date(now);
    fourMonthsAgoStart.setUTCMonth(fourMonthsAgoStart.getUTCMonth() - 4);
    const fourMonthsAgoEnd = new Date(now);
    fourMonthsAgoEnd.setUTCMonth(fourMonthsAgoEnd.getUTCMonth() - 3);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub-2',
        currentPeriodStart: fourMonthsAgoStart,
        currentPeriodEnd: fourMonthsAgoEnd,
      },
    ]);

    await cron.advanceExpiredFreeTierPeriods();

    expect(mockPrisma.subscription.update).toHaveBeenCalledTimes(1);
    const updateArg = mockPrisma.subscription.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'sub-2' });
    expect((updateArg.data.currentPeriodEnd as Date).getTime()).toBeGreaterThan(
      now.getTime(),
    );
  });

  it('filters findMany by tier FREE (paid-row exclusion enforced at the query level)', async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await cron.advanceExpiredFreeTierPeriods();

    const callArg = mockPrisma.subscription.findMany.mock.calls[0][0];
    expect(callArg.where.tier).toBe('FREE');
  });
});
