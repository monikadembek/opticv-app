import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { QuotaService } from '../quota/quota.service';

const mockUser = { id: 'user-id', supabaseId: 'sb-id', email: 'test@example.com' };

const mockTx = {
  user: {
    upsert: jest.fn().mockResolvedValue(mockUser),
  },
  subscription: {
    upsert: jest.fn().mockResolvedValue({}),
  },
};

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  cvDocument: {
    count: jest.fn().mockResolvedValue(0),
  },
};

const mockR2 = {
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  getOrThrow: jest.fn(),
};

const mockQuotaService = {
  getQuotaStatus: jest.fn().mockResolvedValue([]),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.cvDocument.count.mockResolvedValue(0);
    mockQuotaService.getQuotaStatus.mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: R2Service, useValue: mockR2 },
        { provide: ConfigService, useValue: mockConfig },
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('creates user and subscription when neither exists', async () => {
    const result = await service.upsertUser({
      supabaseId: 'sb-id',
      email: 'test@example.com',
    });

    expect(mockTx.user.upsert).toHaveBeenCalledWith({
      where: { supabaseId: 'sb-id' },
      create: { supabaseId: 'sb-id', email: 'test@example.com' },
      update: { email: 'test@example.com' },
    });
    expect(mockTx.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      create: { userId: 'user-id', tier: 'FREE', status: 'ACTIVE' },
      update: {},
    });
    expect(result).toEqual(mockUser);
  });

  it('is idempotent when user already exists', async () => {
    await service.upsertUser({ supabaseId: 'sb-id', email: 'test@example.com' });
    await service.upsertUser({ supabaseId: 'sb-id', email: 'test@example.com' });

    expect(mockTx.user.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.subscription.upsert).toHaveBeenCalledTimes(2);
  });

  it('updates the email of an existing user when it has changed in Supabase', async () => {
    mockTx.user.upsert.mockResolvedValueOnce({
      ...mockUser,
      email: 'new@example.com',
    });

    const result = await service.upsertUser({
      supabaseId: 'sb-id',
      email: 'new@example.com',
    });

    expect(mockTx.user.upsert).toHaveBeenCalledWith({
      where: { supabaseId: 'sb-id' },
      create: { supabaseId: 'sb-id', email: 'new@example.com' },
      update: { email: 'new@example.com' },
    });
    expect(result.email).toBe('new@example.com');
  });

  it('propagates transaction errors', async () => {
    mockTx.user.upsert.mockRejectedValueOnce(new Error('db error'));

    await expect(
      service.upsertUser({ supabaseId: 'sb-id', email: 'test@example.com' }),
    ).rejects.toThrow('db error');
  });

  describe('updateDisplayName', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateDisplayName('sb-id', { displayName: 'Jane Doe' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('updates the display name and returns the mapped profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Jane Doe',
        avatarUrl: null,
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });

      const result = await service.updateDisplayName('sb-id', {
        displayName: 'Jane Doe',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { displayName: 'Jane Doe' },
        include: { subscription: true },
      });
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Jane Doe',
        avatarUrl: null,
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
    });

    it('returns a null subscription when the user has none', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        subscription: null,
      });
      mockPrisma.user.update.mockResolvedValueOnce({
        id: 'user-id',
        email: 'test@example.com',
        displayName: 'Jane Doe',
        avatarUrl: null,
        subscription: null,
      });

      const result = await service.updateDisplayName('sb-id', {
        displayName: 'Jane Doe',
      });

      expect(result.subscription).toBeNull();
    });
  });

  describe('getUsageStatus', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getUsageStatus('sb-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('defaults to FREE tier when subscription is missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        subscription: null,
      });

      await service.getUsageStatus('sb-id');

      expect(mockQuotaService.getQuotaStatus).toHaveBeenCalledWith(
        'user-id',
        'FREE',
      );
    });

    it('returns quotas and stored CV usage for the resolved tier', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-id',
        subscription: { tier: 'BASIC' },
      });
      mockQuotaService.getQuotaStatus.mockResolvedValueOnce([
        {
          feature: 'CV_OPTIMIZATION',
          used: 2,
          limit: 10,
          remaining: 8,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
      ]);
      mockPrisma.cvDocument.count.mockResolvedValueOnce(3);

      const result = await service.getUsageStatus('sb-id');

      expect(mockQuotaService.getQuotaStatus).toHaveBeenCalledWith(
        'user-id',
        'BASIC',
      );
      expect(result).toEqual({
        quotas: [
          {
            feature: 'CV_OPTIMIZATION',
            used: 2,
            limit: 10,
            remaining: 8,
            resetsAt: '2026-08-01T00:00:00.000Z',
          },
        ],
        storedCvs: { used: 3, limit: 10 },
      });
    });
  });
});
