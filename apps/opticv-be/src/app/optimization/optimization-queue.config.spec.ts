import { ConfigService } from '@nestjs/config';
import {
  buildOptimizationJobOptions,
  buildOptimizationWorkerOptions,
} from './optimization-queue.config.js';

const makeConfig = (values: Record<string, number>) =>
  ({ get: jest.fn((key: string) => values[key]) }) as unknown as ConfigService;

describe('buildOptimizationJobOptions', () => {
  it('sets retries and retention from config', () => {
    const config = makeConfig({
      'bullmq.removeOnCompleteAge': 120,
      'bullmq.removeOnCompleteCount': 10,
      'bullmq.removeOnFailAge': 86400,
    });

    expect(buildOptimizationJobOptions(config)).toEqual({
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 120, count: 10 },
      removeOnFail: { age: 86400 },
    });
  });

  it('falls back to default retention when config values are missing', () => {
    const options = buildOptimizationJobOptions(makeConfig({}));

    expect(options.removeOnComplete).toEqual({ age: 3600, count: 100 });
    expect(options.removeOnFail).toEqual({ age: 604800 });
  });
});

describe('buildOptimizationWorkerOptions', () => {
  it('reads worker options from env', () => {
    expect(
      buildOptimizationWorkerOptions({
        BULLMQ_CONCURRENCY: '3',
        BULLMQ_STALLED_INTERVAL: '600000',
        BULLMQ_DRAIN_DELAY: '120',
      }),
    ).toEqual({ concurrency: 3, stalledInterval: 600000, drainDelay: 120 });
  });

  it('falls back to defaults when env values are missing', () => {
    expect(buildOptimizationWorkerOptions({})).toEqual({
      concurrency: 5,
      stalledInterval: 300000,
      drainDelay: 60,
    });
  });
});
