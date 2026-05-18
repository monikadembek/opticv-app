import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { OptimizationJobPayload } from './optimization.types.js';
import { PromptType } from '../../generated/prisma/enums.js';

const ALL_PROMPT_TYPES = Object.values(PromptType);

@Injectable()
export class OptimizationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('optimization') private readonly queue: Queue,
  ) {}

  async triggerOptimization(
    jobApplicationId: string,
    userId: string,
  ): Promise<{ runId: string }> {
    const record = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      include: { cvDocument: true },
    });

    if (!record || record.userId !== userId) {
      throw new ForbiddenException();
    }

    if (record.cvDocument.parseStatus !== 'COMPLETED') {
      throw new BadRequestException('CV document is not yet parsed.');
    }

    if (!record.jobDescription?.trim()) {
      throw new BadRequestException('Job description is required.');
    }

    const runId = randomUUID();

    const payloadBase = {
      runId,
      jobApplicationId,
      userId,
      cvText: record.cvDocument.parsedText ?? '',
      parsedSections: record.cvDocument.structuredData ?? {},
      jobDescription: record.jobDescription,
    };

    await Promise.all(
      ALL_PROMPT_TYPES.map((promptType) =>
        this.prisma.optimizationResult.upsert({
          where: {
            applicationId_promptType: {
              applicationId: jobApplicationId,
              promptType,
            },
          },
          create: { applicationId: jobApplicationId, promptType, status: 'PENDING' },
          update: {
            status: 'PENDING',
            structuredOutput: Prisma.DbNull,
            textOutput: null,
            errorMessage: null,
            promptVersionId: null,
            inputTokens: null,
            outputTokens: null,
          },
        }),
      ),
    );

    await Promise.all(
      ALL_PROMPT_TYPES.map((promptType) =>
        this.queue.add(
          'optimize',
          { ...payloadBase, promptType } satisfies OptimizationJobPayload,
          { attempts: 2, backoff: { type: 'exponential', delay: 2000 } },
        ),
      ),
    );

    return { runId };
  }

  async assertOwnership(jobApplicationId: string, userId: string): Promise<void> {
    const record = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      select: { userId: true },
    });
    if (!record || record.userId !== userId) {
      throw new ForbiddenException();
    }
  }
}
