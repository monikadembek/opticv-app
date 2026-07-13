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
import type { LimitedFeature, SubscriptionTier } from '@opticv/datatypes';
import { OptimizationResultSummary } from '@opticv/datatypes';
import { QuotaService } from '../quota/quota.service.js';

const CV_SUBSET_PROMPT_TYPES: PromptType[] = [
  PromptType.RESUME_AUTOPSY,
  PromptType.KEYWORD_GAP,
  PromptType.SUMMARY_REWRITE,
  PromptType.BULLET_UPGRADE,
];

const PROMPT_TYPE_TO_FEATURE: Record<PromptType, LimitedFeature> = {
  [PromptType.RESUME_AUTOPSY]: 'CV_OPTIMIZATION',
  [PromptType.KEYWORD_GAP]: 'CV_OPTIMIZATION',
  [PromptType.SUMMARY_REWRITE]: 'CV_OPTIMIZATION',
  [PromptType.BULLET_UPGRADE]: 'CV_OPTIMIZATION',
  [PromptType.COVER_LETTER]: 'COVER_LETTER',
  [PromptType.INTERVIEW_PREP]: 'INTERVIEW_PREP',
  [PromptType.LINKEDIN_REWRITE]: 'LINKEDIN',
};

@Injectable()
export class OptimizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    @InjectQueue('optimization') private readonly queue: Queue,
  ) {}

  private async resolveTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true },
    });
    return (subscription?.tier ?? 'FREE') as SubscriptionTier;
  }

  async triggerOptimization(
    jobApplicationId: string,
    userId: string,
  ): Promise<{ runId: string }> {
    const { cvText, parsedSections, jobDescription } =
      await this.loadAndValidateApplication(jobApplicationId, userId);

    const tier = await this.resolveTier(userId);
    await this.quotaService.checkAndConsume(userId, 'CV_OPTIMIZATION', tier);

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
      CV_SUBSET_PROMPT_TYPES.map((promptType) =>
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
      CV_SUBSET_PROMPT_TYPES.map((promptType) =>
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

    const tier = await this.resolveTier(userId);
    const feature = PROMPT_TYPE_TO_FEATURE[promptType];
    await this.quotaService.checkAndConsume(userId, feature, tier);

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

  async retryFailedJob(
    jobApplicationId: string,
    promptType: PromptType,
    userId: string,
  ): Promise<{ runId: string }> {
    const { cvText, parsedSections, jobDescription } =
      await this.loadAndValidateApplication(jobApplicationId, userId);

    const existing = await this.prisma.optimizationResult.findUnique({
      where: {
        applicationId_promptType: {
          applicationId: jobApplicationId,
          promptType,
        },
      },
    });

    if (!existing || existing.status !== 'FAILED') {
      throw new BadRequestException(
        'Only a failed result can be retried for free; use the normal trigger endpoint instead.',
      );
    }

    const runId = randomUUID();

    await this.prisma.optimizationResult.update({
      where: { id: existing.id },
      data: {
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
  ): Promise<OptimizationResultSummary[]> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: jobApplicationId },
      select: { userId: true },
    });

    if (!application || application.userId !== userId) {
      throw new ForbiddenException();
    }

    const results = await this.prisma.optimizationResult.findMany({
      where: { applicationId: jobApplicationId },
      select: {
        id: true,
        promptType: true,
        status: true,
        userEditedOutput: true,
        structuredOutput: true,
      },
    });

    return results as OptimizationResultSummary[];
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
