import { ConfigService } from '@nestjs/config';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

export function createThrottlerStorage(
  config: ConfigService,
): ThrottlerStorage | undefined {
  if (config.get<string>('throttler.storage') !== 'redis') {
    return undefined;
  }

  return new ThrottlerStorageRedisService({
    host: config.get<string>('redis.host'),
    port: config.get<number>('redis.port'),
    password: config.get<string>('redis.password'),
    tls: config.get<boolean>('redis.tls') ? {} : undefined,
  });
}
