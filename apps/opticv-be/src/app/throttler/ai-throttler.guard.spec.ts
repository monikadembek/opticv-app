import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerModuleOptions } from '@nestjs/throttler';
import { AiThrottlerGuard } from './ai-throttler.guard';

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
    timeToExpire: 3600,
    isBlocked: blocked,
    timeToBlockExpire: blocked ? 3600 : 0,
  }),
});

const makeOptions = (): ThrottlerModuleOptions => ({
  throttlers: [
    { name: 'ai-ip', ttl: 3600, limit: 50 },
    { name: 'ai-user', ttl: 3600, limit: 10 },
  ],
});

const makeGuard = (storage: ReturnType<typeof makeStorage>) => {
  const guard = new AiThrottlerGuard(
    makeOptions(),
    storage as never,
    new Reflector(),
  );
  (guard as unknown as { throttlers: unknown[]; commonOptions: unknown }).throttlers = [
    { name: 'ai-ip', ttl: 3600, limit: 50 },
    { name: 'ai-user', ttl: 3600, limit: 10 },
  ];
  (guard as unknown as { commonOptions: { getTracker: () => Promise<string>; generateKey: (ctx: ExecutionContext, s: string, n: string) => string } }).commonOptions = {
    getTracker: async () => '127.0.0.1',
    generateKey: (_ctx: ExecutionContext, suffix: string, name: string) => `${name}-${suffix}`,
  };
  return guard;
};

describe('AiThrottlerGuard', () => {
  it('checks AI IP bucket using request.ip', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('5.6.7.8', 'user-xyz');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 50,
      ttl: 3600,
      throttler: { name: 'ai-ip', ttl: 3600, limit: 50 },
      blockDuration: 3600,
      getTracker: async () => '5.6.7.8',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).toHaveBeenCalled();
  });

  it('checks AI user bucket using request.user.id', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('5.6.7.8', 'user-xyz');

    const result = await guard['handleRequest']({
      context: ctx,
      limit: 10,
      ttl: 3600,
      throttler: { name: 'ai-user', ttl: 3600, limit: 10 },
      blockDuration: 3600,
      getTracker: async () => 'user-xyz',
      generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
    });

    expect(result).toBe(true);
    expect(storage.increment).toHaveBeenCalled();
  });

  it('skips non-AI throttler names', async () => {
    const storage = makeStorage();
    const guard = makeGuard(storage);
    const ctx = makeContext('5.6.7.8', 'user-xyz');

    for (const name of ['api-ip', 'api-user', 'default']) {
      const result = await guard['handleRequest']({
        context: ctx,
        limit: 300,
        ttl: 900,
        throttler: { name, ttl: 900, limit: 300 },
        blockDuration: 900,
        getTracker: async () => '5.6.7.8',
        generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
      });
      expect(result).toBe(true);
    }

    expect(storage.increment).not.toHaveBeenCalled();
  });

  it('throws ThrottlerException when AI IP limit is exceeded', async () => {
    const storage = makeStorage(true);
    const guard = makeGuard(storage);
    const ctx = makeContext('5.6.7.8', 'user-xyz');

    await expect(
      guard['handleRequest']({
        context: ctx,
        limit: 50,
        ttl: 3600,
        throttler: { name: 'ai-ip', ttl: 3600, limit: 50 },
        blockDuration: 3600,
        getTracker: async () => '5.6.7.8',
        generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
      }),
    ).rejects.toThrow(ThrottlerException);
  });

  it('throws ThrottlerException when AI user limit is exceeded', async () => {
    const storage = makeStorage(true);
    const guard = makeGuard(storage);
    const ctx = makeContext('5.6.7.8', 'user-xyz');

    await expect(
      guard['handleRequest']({
        context: ctx,
        limit: 10,
        ttl: 3600,
        throttler: { name: 'ai-user', ttl: 3600, limit: 10 },
        blockDuration: 3600,
        getTracker: async () => 'user-xyz',
        generateKey: (_c: ExecutionContext, s: string, n: string) => `${n}-${s}`,
      }),
    ).rejects.toThrow(ThrottlerException);
  });
});
