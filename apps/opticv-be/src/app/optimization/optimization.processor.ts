import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { OpenAiService } from '../ai/services/openai.service.js';
import { PromptService } from '../ai/services/prompt.service.js';
import { CostCalculatorService } from '../ai/services/cost-calculator.service.js';
import { UsageLogService } from '../ai/services/usage-log.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import type { OptimizationJobPayload } from './optimization.types.js';

const FALLBACK_MODEL = 'gpt-4o-mini';
const CONCURRENCY = parseInt(process.env['BULLMQ_CONCURRENCY'] ?? '5', 10);

@Processor('optimization', { concurrency: CONCURRENCY })
export class OptimizationProcessor extends WorkerHost {
  private readonly logger = new Logger(OptimizationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly promptService: PromptService,
    private readonly eventBus: OptimizationEventBus,
    private readonly costCalculator: CostCalculatorService,
    private readonly usageLogService: UsageLogService,
  ) {
    super();
  }

  async process(job: Job<OptimizationJobPayload>): Promise<void> {
    const {
      runId,
      jobApplicationId,
      promptType,
      cvText,
      parsedSections,
      jobDescription,
    } = job.data;

    await this.prisma.optimizationResult.update({
      where: {
        applicationId_promptType: {
          applicationId: jobApplicationId,
          promptType,
        },
      },
      data: { status: 'PROCESSING' },
    });

    try {
      const promptVersion =
        await this.promptService.getActivePrompt(promptType);

      const userPrompt = this.promptService.buildUserPrompt(
        promptVersion.userPromptTemplate,
        {
          resumeText: cvText,
          parsedSectionsJson: JSON.stringify(parsedSections),
          jobDescription,
          targetRole: '',
          seniority: '',
          industry: '',
          yearsExperience: '',
        },
      );

      const outputSchema = promptVersion.outputSchema as {
        name: string;
        input_schema: Record<string, unknown>;
      } | null;

      if (!outputSchema) {
        throw new Error(`Prompt version for ${promptType} has no outputSchema — cannot generate structured output`);
      }

      const model = promptVersion.modelPreference ?? FALLBACK_MODEL;

      const { content, promptTokens, completionTokens } =
        await this.openAiService.generateCompletion(
          promptVersion.systemPrompt,
          userPrompt,
          model,
          outputSchema,
        );

      const structuredOutput = JSON.parse(content) as Prisma.InputJsonValue;

      await this.prisma.optimizationResult.update({
        where: {
          applicationId_promptType: {
            applicationId: jobApplicationId,
            promptType,
          },
        },
        data: {
          status: 'COMPLETED',
          promptVersionId: promptVersion.id,
          structuredOutput,
          textOutput: null,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
        },
      });

      try {
        const costUsd = this.costCalculator.calculate(
          model,
          promptTokens,
          completionTokens,
        );
        await this.usageLogService.log({
          userId: job.data.userId,
          promptType,
          modelId: model,
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          costUsd,
        });
      } catch (err: unknown) {
        this.logger.error(
          `UsageLog write failed for ${promptType}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      this.eventBus.emit(runId, {
        promptType,
        status: 'completed',
        result: structuredOutput,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job failed for ${promptType}: ${message}`);

      await this.prisma.optimizationResult.update({
        where: {
          applicationId_promptType: {
            applicationId: jobApplicationId,
            promptType,
          },
        },
        data: { status: 'FAILED', errorMessage: message },
      });

      this.eventBus.emit(runId, {
        promptType,
        status: 'failed',
        error: message,
      });

      throw err;
    }
  }
}
