import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProduces,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  RunIdResponseDto,
  SaveUserOutputResponseDto,
} from './dto/optimization-response.dto.js';
import { OptimizationResultSummaryDto } from './dto/optimization-result-summary.dto.js';
import { SaveUserOutputDto } from './dto/save-user-output.dto.js';
import { SupabaseGuard } from '../auth/supabase.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { UserModel } from '../../generated/prisma/models.js';
import { PromptType } from '../../generated/prisma/enums.js';
import { OptimizationService } from './optimization.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';

const TOTAL_JOBS = Object.values(PromptType).length;

class TriggerSingleJobDto {
  @ApiProperty({ example: 'run-uuid-123', required: false })
  runId?: string;
}

@ApiTags('optimizations')
@ApiBearerAuth()
@Controller('optimizations')
@UseGuards(SupabaseGuard)
export class OptimizationController {
  constructor(
    private readonly optimizationService: OptimizationService,
    private readonly eventBus: OptimizationEventBus,
  ) {}

  @Post('job-applications/:jobApplicationId/run')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Trigger full optimization run for a job application',
  })
  @ApiResponse({
    status: 202,
    type: RunIdResponseDto,
    description: 'Optimization run accepted',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  async triggerOptimization(
    @Param('jobApplicationId') jobApplicationId: string,
    @CurrentUser() user: UserModel,
  ): Promise<{ runId: string }> {
    return this.optimizationService.triggerOptimization(
      jobApplicationId,
      user.id,
    );
  }

  @Post('job-applications/:jobApplicationId/run/:promptType')
  @HttpCode(202)
  @ApiOperation({ summary: 'Trigger a single optimization job within a run' })
  @ApiResponse({
    status: 202,
    type: RunIdResponseDto,
    description: 'Job accepted',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid promptType or missing runId',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
  async triggerSingleJob(
    @Param('jobApplicationId') jobApplicationId: string,
    @Param('promptType') promptType: string,
    @Body() body: TriggerSingleJobDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ runId: string }> {
    if (!Object.values(PromptType).includes(promptType as PromptType)) {
      throw new BadRequestException('Invalid promptType.');
    }

    return this.optimizationService.triggerSingleJob(
      jobApplicationId,
      promptType as PromptType,
      body.runId?.trim(),
      user.id,
    );
  }

  @Patch(':id/user-output')
  @ApiOperation({
    summary: 'Save user-edited output for an optimization result',
  })
  @ApiBody({ type: SaveUserOutputDto })
  @ApiResponse({
    status: 200,
    type: SaveUserOutputResponseDto,
    description: 'User output saved',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  saveUserOutput(
    @Param('id') id: string,
    @Body() body: SaveUserOutputDto,
    @CurrentUser() user: UserModel,
  ): Promise<{ userEditedOutput: string }> {
    return this.optimizationService.saveUserOutput(
      id,
      body.userEditedOutput,
      user.id,
    );
  }

  @Get('job-applications/:jobApplicationId/results')
  @ApiOperation({
    summary: 'Get optimization result summaries for a job application',
  })
  @ApiResponse({ status: 200, type: [OptimizationResultSummaryDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getOptimizationResultSummaries(
    @Param('jobApplicationId') jobApplicationId: string,
    @CurrentUser() user: UserModel,
  ): Promise<OptimizationResultSummaryDto[]> {
    return this.optimizationService.getOptimizationResultSummaries(
      jobApplicationId,
      user.id,
    );
  }

  @Get('job-applications/:jobApplicationId/stream')
  @ApiOperation({ summary: 'Stream optimization progress events (SSE)' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'Server-sent events stream' })
  @ApiResponse({ status: 400, description: 'Missing runId' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Job application not found' })
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

    await this.optimizationService.validateStreamAccess(
      jobApplicationId,
      user.id,
    );

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
        const completePayload = {
          runId,
          completedAt: new Date().toISOString(),
        };
        res.write(
          `event: run-complete\ndata: ${JSON.stringify(completePayload)}\n\n`,
        );
        unsubscribe();
        res.end();
      }
    });

    req.on('close', () => {
      unsubscribe();
    });
  }
}
