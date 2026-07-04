import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

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
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
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
      where: { email: 'test@example.com' },
      create: { supabaseId: 'sb-id', email: 'test@example.com' },
      update: { supabaseId: 'sb-id' },
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

  it('propagates transaction errors', async () => {
    mockTx.user.upsert.mockRejectedValueOnce(new Error('db error'));

    await expect(
      service.upsertUser({ supabaseId: 'sb-id', email: 'test@example.com' }),
    ).rejects.toThrow('db error');
  });
});
