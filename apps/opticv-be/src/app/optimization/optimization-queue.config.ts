import { ConfigService } from '@nestjs/config';
import type { DefaultJobOptions, WorkerOptions } from 'bullmq';

export const OPTIMIZATION_QUEUE = 'optimization';

export function buildOptimizationJobOptions(
  config: ConfigService,
): DefaultJobOptions {
  return {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: {
      age: config.get<number>('bullmq.removeOnCompleteAge') ?? 3600,
      count: config.get<number>('bullmq.removeOnCompleteCount') ?? 100,
    },
    removeOnFail: {
      age: config.get<number>('bullmq.removeOnFailAge') ?? 604800,
    },
  };
}

export function buildOptimizationWorkerOptions(
  env: NodeJS.ProcessEnv = process.env,
): Pick<WorkerOptions, 'concurrency' | 'stalledInterval' | 'drainDelay'> {
  return {
    concurrency: parseInt(env['BULLMQ_CONCURRENCY'] ?? '5', 10),
    stalledInterval: parseInt(env['BULLMQ_STALLED_INTERVAL'] ?? '300000', 10),
    drainDelay: parseInt(env['BULLMQ_DRAIN_DELAY'] ?? '60', 10),
  };
}
