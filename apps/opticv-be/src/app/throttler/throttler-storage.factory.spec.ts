import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { createThrottlerStorage } from './throttler-storage.factory';

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: jest.fn(),
}));

const makeConfig = (values: Record<string, unknown>) =>
  ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

const redisValues = {
  'redis.host': 'redis.example.com',
  'redis.port': 6380,
  'redis.password': 'secret',
};

describe('createThrottlerStorage', () => {
  beforeEach(() => {
    jest.mocked(ThrottlerStorageRedisService).mockClear();
  });

  it('returns no custom storage for memory', () => {
    expect(
      createThrottlerStorage(
        makeConfig({ 'throttler.storage': 'memory', ...redisValues }),
      ),
    ).toBeUndefined();
    expect(ThrottlerStorageRedisService).not.toHaveBeenCalled();
  });

  it('returns no custom storage when storage is not set', () => {
    expect(createThrottlerStorage(makeConfig({}))).toBeUndefined();
    expect(ThrottlerStorageRedisService).not.toHaveBeenCalled();
  });

  it('returns Redis storage built from the redis config', () => {
    const storage = createThrottlerStorage(
      makeConfig({
        'throttler.storage': 'redis',
        'redis.tls': true,
        ...redisValues,
      }),
    );

    expect(storage).toBeInstanceOf(ThrottlerStorageRedisService);
    expect(ThrottlerStorageRedisService).toHaveBeenCalledWith({
      host: 'redis.example.com',
      port: 6380,
      password: 'secret',
      tls: {},
    });
  });

  it('omits tls when redis.tls is false', () => {
    createThrottlerStorage(
      makeConfig({
        'throttler.storage': 'redis',
        'redis.tls': false,
        ...redisValues,
      }),
    );

    expect(ThrottlerStorageRedisService).toHaveBeenCalledWith(
      expect.objectContaining({ tls: undefined }),
    );
  });
});
