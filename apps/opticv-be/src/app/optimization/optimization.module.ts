import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QuotaModule } from '../quota/quota.module.js';
import { OptimizationController } from './optimization.controller.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { OptimizationProcessor } from './optimization.processor.js';
import { OptimizationService } from './optimization.service.js';
import {
  OPTIMIZATION_QUEUE,
  buildOptimizationJobOptions,
} from './optimization-queue.config.js';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: OPTIMIZATION_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: buildOptimizationJobOptions(config),
      }),
    }),
    PrismaModule,
    AiModule,
    AuthModule,
    QuotaModule,
  ],
  controllers: [OptimizationController],
  providers: [OptimizationService, OptimizationProcessor, OptimizationEventBus],
})
export class OptimizationModule {}
