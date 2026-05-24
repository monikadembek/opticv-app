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
    const { cvText, parsedSections, jobDescription } =
      await this.loadAndValidateApplication(jobApplicationId, userId);

    const runId = randomUUID();

    const payloadBase = {
      runId,
      jobApplicationId,
      userId,
      cvText,
      parsedSections,
      jobDescription,
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
          create: {
            applicationId: jobApplicationId,
            promptType,
            status: 'PENDING',
          },
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

  async triggerSingleJob(
    jobApplicationId: string,
    promptType: PromptType,
    runId: string | undefined,
    userId: string,
  ): Promise<{ runId: string }> {
    runId = runId ?? randomUUID();
    const { cvText, parsedSections, jobDescription } =
      await this.loadAndValidateApplication(jobApplicationId, userId);

    await this.prisma.optimizationResult.upsert({
      where: {
        applicationId_promptType: {
          applicationId: jobApplicationId,
          promptType,
        },
      },
      create: {
        applicationId: jobApplicationId,
        promptType,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
        structuredOutput: Prisma.DbNull,
        textOutput: null,
        errorMessage: null,
        promptVersionId: null,
        inputTokens: null,
        outputTokens: null,
      },
    });

    await this.queue.add(
      'optimize',
      {
        runId,
        jobApplicationId,
        userId,
        promptType,
        cvText,
        parsedSections,
        jobDescription,
      } satisfies OptimizationJobPayload,
      { attempts: 2, backoff: { type: 'exponential', delay: 2000 } },
    );

    return { runId };
  }

  async saveUserOutput(
    id: string,
    userEditedOutput: string,
    userId: string,
  ): Promise<{ userEditedOutput: string }> {
    const record = await this.prisma.optimizationResult.findUnique({
      where: { id },
      include: { application: { select: { userId: true } } },
    });

    if (!record || record.application.userId !== userId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.optimizationResult.update({
      where: { id },
      data: { userEditedOutput },
      select: { userEditedOutput: true },
    });

    return { userEditedOutput: updated.userEditedOutput as string };
  }

  async getOptimizationResultSummaries(
    jobApplicationId: string,
    userId: string,
  ): Promise<
    {
      id: string;
      promptType: PromptType;
      status: string;
      userEditedOutput: string | null;
    }[]
  > {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      select: { userId: true },
    });

    if (!application || application.userId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.optimizationResult.findMany({
      where: { applicationId: jobApplicationId },
      select: {
        id: true,
        promptType: true,
        status: true,
        userEditedOutput: true,
      },
    });
  }

  async validateStreamAccess(
    jobApplicationId: string,
    userId: string,
  ): Promise<void> {
    const record = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      select: { userId: true },
    });
    if (!record || record.userId !== userId) {
      throw new ForbiddenException();
    }
  }

  private async loadAndValidateApplication(
    jobApplicationId: string,
    userId: string,
  ): Promise<{
    cvText: string;
    parsedSections: unknown;
    jobDescription: string;
  }> {
    const record = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      include: { cvDocument: true },
    });

    if (!record || record.userId !== userId) {
      throw new ForbiddenException();
    }

    if (!record.cvDocument || record.cvDocument.parseStatus !== 'COMPLETED') {
      throw new BadRequestException('CV document is not yet parsed.');
    }

    if (!record.jobDescription?.trim()) {
      throw new BadRequestException('Job description is required.');
    }

    return {
      cvText: record.cvDocument.parsedText ?? '',
      parsedSections: record.cvDocument.structuredData ?? {},
      jobDescription: record.jobDescription,
    };
  }
}
