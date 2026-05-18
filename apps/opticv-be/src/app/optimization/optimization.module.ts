import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OptimizationController } from './optimization.controller.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { OptimizationProcessor } from './optimization.processor.js';
import { OptimizationService } from './optimization.service.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'optimization' }),
    PrismaModule,
    AiModule,
    AuthModule,
  ],
  controllers: [OptimizationController],
  providers: [OptimizationService, OptimizationProcessor, OptimizationEventBus],
})
export class OptimizationModule {}
