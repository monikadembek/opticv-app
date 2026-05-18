import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SupabaseGuard } from '../auth/supabase.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserModel } from '../../generated/prisma/models.js';
import { PromptType } from '../../generated/prisma/enums.js';
import { OptimizationService } from './optimization.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';

const TOTAL_JOBS = Object.values(PromptType).length;

class TriggerSingleJobDto {
  runId!: string;
}

@Controller('optimizations')
@UseGuards(SupabaseGuard)
export class OptimizationController {
  constructor(
    private readonly optimizationService: OptimizationService,
    private readonly eventBus: OptimizationEventBus,
  ) {}

  @Post('job-applications/:jobApplicationId/run')
  @HttpCode(202)
  async triggerOptimization(
    @Param('jobApplicationId') jobApplicationId: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ runId: string }> {
    return this.optimizationService.triggerOptimization(jobApplicationId, user.id);
  }

  @Post('job-applications/:jobApplicationId/run/:promptType')
  @HttpCode(202)
  async triggerSingleJob(
    @Param('jobApplicationId') jobApplicationId: string,
    @Param('promptType') promptType: string,
    @Body() body: TriggerSingleJobDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ runId: string }> {
    if (!Object.values(PromptType).includes(promptType as PromptType)) {
      throw new BadRequestException('Invalid promptType.');
    }

    if (!body.runId?.trim()) {
      throw new BadRequestException('runId is required.');
    }

    return this.optimizationService.triggerSingleJob(
      jobApplicationId,
      promptType as PromptType,
      body.runId.trim(),
      user.id,
    );
  }

  @Get('job-applications/:jobApplicationId/stream')
  async streamOptimization(
    @Param('jobApplicationId') jobApplicationId: string,
    @Query('runId') runId: string,
    @CurrentUser() user: UserModel,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!runId?.trim()) {
      throw new BadRequestException('runId query parameter is required.');
    }

    await this.optimizationService.validateStreamAccess(jobApplicationId, user.id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let resolved = 0;

    const unsubscribe = this.eventBus.subscribe(runId, (event) => {
      if (res.writableEnded) return;

      res.write(`event: job-complete\ndata: ${JSON.stringify(event)}\n\n`);
      resolved++;

      if (resolved === TOTAL_JOBS) {
        const completePayload = { runId, completedAt: new Date().toISOString() };
        res.write(`event: run-complete\ndata: ${JSON.stringify(completePayload)}\n\n`);
        unsubscribe();
        res.end();
      }
    });

    req.on('close', () => {
      unsubscribe();
    });
  }
}
