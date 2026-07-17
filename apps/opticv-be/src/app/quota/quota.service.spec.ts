import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { QuotaService } from './quota.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockPrisma = {
  usageQuota: {
    upsert: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('QuotaService', () => {
  let service: QuotaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuotaService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(QuotaService);
  });

  describe('checkAndConsume', () => {
    it('throws FEATURE_NOT_AVAILABLE when the tier limit is 0', async () => {
      await expect(
        service.checkAndConsume('user-1', 'LINKEDIN', 'FREE'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.usageQuota.upsert).not.toHaveBeenCalled();
    });

    it('increments the counter and resolves when under the limit', async () => {
      mockPrisma.usageQuota.upsert.mockResolvedValue({ id: 'row-1' });
      mockPrisma.usageQuota.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.usageQuota.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'row-1', count: { lt: 1 } }),
          data: { count: { increment: 1 } },
        }),
      );
    });

    it('throws QUOTA_EXCEEDED when the conditional update affects no rows', async () => {
      mockPrisma.usageQuota.upsert.mockResolvedValue({ id: 'row-1' });
      mockPrisma.usageQuota.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('uses the current calendar month as periodStart', async () => {
      mockPrisma.usageQuota.upsert.mockResolvedValue({ id: 'row-1' });
      mockPrisma.usageQuota.updateMany.mockResolvedValue({ count: 1 });

      await service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE');

      const upsertArg = mockPrisma.usageQuota.upsert.mock.calls[0][0];
      const periodStart: Date = upsertArg.create.periodStart;
      const now = new Date();
      expect(periodStart.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(periodStart.getUTCMonth()).toBe(now.getUTCMonth());
      expect(periodStart.getUTCDate()).toBe(1);
    });

    it('does not count usage from a previous period toward the current limit', async () => {
      mockPrisma.usageQuota.upsert.mockResolvedValue({ id: 'row-current' });
      mockPrisma.usageQuota.updateMany.mockResolvedValue({ count: 1 });

      await service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE');

      const updateManyArg = mockPrisma.usageQuota.updateMany.mock.calls[0][0];
      expect(updateManyArg.where.id).toBe('row-current');
    });

    it('retries the transaction when a concurrent request wins the upsert race (P2002)', async () => {
      const p2002 = new PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.8.0',
      });

      mockPrisma.$transaction
        .mockImplementationOnce(() => Promise.reject(p2002))
        .mockImplementationOnce((fn) => fn(mockPrisma));
      mockPrisma.usageQuota.upsert.mockResolvedValue({ id: 'row-1' });
      mockPrisma.usageQuota.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE'),
      ).resolves.toBeUndefined();

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('rethrows non-P2002 errors without retrying', async () => {
      const otherError = new Error('connection lost');
      mockPrisma.$transaction.mockImplementationOnce(() => Promise.reject(otherError));

      await expect(
        service.checkAndConsume('user-1', 'CV_OPTIMIZATION', 'FREE'),
      ).rejects.toThrow('connection lost');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQuotaStatus', () => {
    it('returns used/limit/remaining/resetsAt for all features, defaulting used to 0', async () => {
      mockPrisma.usageQuota.findMany.mockResolvedValue([
        { feature: 'CV_OPTIMIZATION', count: 1 },
      ]);

      const result = await service.getQuotaStatus('user-1', 'FREE');

      const cvOpt = result.find((r) => r.feature === 'CV_OPTIMIZATION');
      expect(cvOpt).toEqual(
        expect.objectContaining({ used: 1, limit: 1, remaining: 0 }),
      );

      const linkedin = result.find((r) => r.feature === 'LINKEDIN');
      expect(linkedin).toEqual(
        expect.objectContaining({ used: 0, limit: 0, remaining: 0 }),
      );

      const coverLetter = result.find((r) => r.feature === 'COVER_LETTER');
      expect(coverLetter).toEqual(
        expect.objectContaining({ used: 0, limit: 1, remaining: 1 }),
      );
    });

    it('reflects BASIC tier limits', async () => {
      mockPrisma.usageQuota.findMany.mockResolvedValue([]);

      const result = await service.getQuotaStatus('user-1', 'BASIC');

      const linkedin = result.find((r) => r.feature === 'LINKEDIN');
      expect(linkedin).toEqual(
        expect.objectContaining({ used: 0, limit: 10, remaining: 10 }),
      );
    });
  });
});
