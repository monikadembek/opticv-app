import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ApiThrottlerGuard } from './api-throttler.guard';

const makeContext = (ip: string, userId?: string): ExecutionContext => {
  const req = { ip, user: userId ? { id: userId } : undefined };
  const res = { header: jest.fn() };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

const makeStorage = (blocked = false) => ({
  increment: jest.fn().mockResolvedValue({
    totalHits: blocked ? 9999 : 1,
    timeToExpire: 900,
    isBlocked: blocked,
    timeToBlockExpire: blocked ? 900 : 0,
  }),
});

const makeOptions = (): ThrottlerModuleOptions => ({
  throttlers: [
    { name: 'api-ip', ttl: 900, limit: 300 },
    { name: 'api-user', ttl: 900, limit: 100 },
  ],
});

const makeGuard = (storage: ReturnType<typeof makeStorage>) => {
  const guard = new ApiThrottlerGuard(
    makeOptions(),
    storage as never,
    new Reflector(),
  );
  (guard as unknown as { throttlers: unknown[]; commonOptions: unknown }).throttlers = [
    { name: 'api-ip', ttl: 900, limit: 300 },
    { name: 'api-user', ttl: 900, limit: 100 },
  ];
  (guard as unknown as { commonOptions: { getTracker: () => Promise<string>; generateKey: (ctx: ExecutionContext, s: string, n: string) => string } }).commonOptions = {
    getTracker: async () => '127.0.0.1',
    generateKey: (_ctx: ExecutionContext, suffix: string, name: string) => `${name}-${suffix}`,
  };
  return guard;
};

describe('ApiThrottlerGuard', () => {
  it('checks IP bucket using request.ip', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 300,
      ttl: 900,
      throttler: { name: 'api-ip', ttl: 900, limit: 300 },
      blockDuration: 900,
      getTracker: async () => '1.2.3.4',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).toHaveBeenCalled();
  });

  it('skips user bucket when request.user is absent', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 100,
      ttl: 900,
      throttler: { name: 'api-user', ttl: 900, limit: 100 },
      blockDuration: 900,
      getTracker: async () => '',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).not.toHaveBeenCalled();
  });

  it('checks user bucket using request.user.id when user is present', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4', 'user-abc');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 100,
      ttl: 900,
      throttler: { name: 'api-user', ttl: 900, limit: 100 },
      blockDuration: 900,
      getTracker: async () => 'user-abc',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).toHaveBeenCalled();
  });

  it('throws ThrottlerException when IP limit is exceeded', async () => {
    const storage = makeStorage(true);
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4');

    await expect(
      guard['handleRequest']({
        context: ctx,
        limit: 300,
        ttl: 900,
        throttler: { name: 'api-ip', ttl: 900, limit: 300 },
        blockDuration: 900,
        getTracker: async () => '1.2.3.4',
        generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
      }),
    ).rejects.toThrow(ThrottlerException);
  });

  it('throws ThrottlerException when user limit is exceeded', async () => {
    const storage = makeStorage(true);
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4', 'user-abc');

    await expect(
      guard['handleRequest']({
        context: ctx,
        limit: 100,
        ttl: 900,
        throttler: { name: 'api-user', ttl: 900, limit: 100 },
        blockDuration: 900,
        getTracker: async () => 'user-abc',
        generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
      }),
    ).rejects.toThrow(ThrottlerException);
  });

  it('returns true for unknown throttler names', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('1.2.3.4');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 10,
      ttl: 3600,
      throttler: { name: 'ai-ip', ttl: 3600, limit: 10 },
      blockDuration: 3600,
      getTracker: async () => '1.2.3.4',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).not.toHaveBeenCalled();
  });
});
