import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { OptimizationProcessor } from './optimization.processor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenAiService } from '../ai/services/openai.service.js';
import { PromptService } from '../ai/services/prompt.service.js';
import { CostCalculatorService } from '../ai/services/cost-calculator.service.js';
import { UsageLogService } from '../ai/services/usage-log.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { PromptType } from '../../generated/prisma/enums.js';
import type { OptimizationJobPayload } from './optimization.types.js';
import type { Job } from 'bullmq';

const PROMPT_TYPE = PromptType.RESUME_AUTOPSY;

const basePayload: OptimizationJobPayload = {
  runId: 'run-1',
  jobApplicationId: 'app-1',
  userId: 'user-1',
  promptType: PROMPT_TYPE,
  cvText: 'resume text',
  parsedSections: { name: 'John' },
  jobDescription: 'Engineer at Acme',
  jobTitle: 'Senior Engineer',
};

const makeJob = (data: OptimizationJobPayload) => ({ data } as Job<OptimizationJobPayload>);

const activePrompt = {
  id: 'pv-1',
  systemPrompt: 'You are a CV reviewer.',
  userPromptTemplate: '{{SHARED_CONTEXT}}',
  modelPreference: 'gpt-4o-mini',
  outputSchema: {
    name: 'submit_audit',
    input_schema: {
      type: 'object',
      required: ['overallScore'],
      properties: { overallScore: { type: 'integer' } },
    },
  },
};

const mockPrisma = {
  optimizationResult: {
    update: jest.fn(),
  },
};

const mockOpenAiService = {
  generateCompletion: jest.fn(),
};

const mockPromptService = {
  getActivePrompt: jest.fn(),
  buildUserPrompt: jest.fn(),
};

const mockEventBus = {
  emit: jest.fn(),
};

const mockCostCalculator = {
  calculate: jest.fn().mockReturnValue({ toFixed: () => '0.000015' }),
};

const mockUsageLogService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('OptimizationProcessor', () => {
  let processor: OptimizationProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OpenAiService, useValue: mockOpenAiService },
        { provide: PromptService, useValue: mockPromptService },
        { provide: OptimizationEventBus, useValue: mockEventBus },
        { provide: CostCalculatorService, useValue: mockCostCalculator },
        { provide: UsageLogService, useValue: mockUsageLogService },
        { provide: getQueueToken('optimization'), useValue: {} },
      ],
    }).compile();

    processor = module.get(OptimizationProcessor);
  });

  it('happy path: sets PROCESSING, calls OpenAI with outputSchema, stores structuredOutput, emits success event', async () => {
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(activePrompt);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockResolvedValue({
      content: '{"overallScore":85}',
      promptTokens: 100,
      completionTokens: 50,
    });

    await processor.process(makeJob(basePayload));

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PROCESSING' } }),
    );
    expect(mockOpenAiService.generateCompletion).toHaveBeenCalledWith(
      activePrompt.systemPrompt,
      'built prompt',
      activePrompt.modelPreference,
      activePrompt.outputSchema,
    );
    expect(mockPromptService.buildUserPrompt).toHaveBeenCalledWith(
      activePrompt.userPromptTemplate,
      expect.objectContaining({ jobTitle: 'Senior Engineer' }),
    );
    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          structuredOutput: { overallScore: 85 },
          textOutput: null,
        }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'completed',
      result: { overallScore: 85 },
    });
  });

  it('uses fallback model when modelPreference is null', async () => {
    const promptWithoutModel = { ...activePrompt, modelPreference: null };
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(promptWithoutModel);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockResolvedValue({
      content: '{"overallScore":70}',
      promptTokens: 80,
      completionTokens: 40,
    });

    await processor.process(makeJob(basePayload));

    expect(mockOpenAiService.generateCompletion).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'gpt-4o-mini',
      expect.anything(),
    );
  });

  it('throws and sets FAILED when outputSchema is null', async () => {
    const promptWithoutSchema = { ...activePrompt, outputSchema: null };
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(promptWithoutSchema);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');

    await expect(processor.process(makeJob(basePayload))).rejects.toThrow(
      `Prompt version for ${PROMPT_TYPE} has no outputSchema`,
    );

    expect(mockOpenAiService.generateCompletion).not.toHaveBeenCalled();
    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'failed',
      error: expect.stringContaining('no outputSchema'),
    });
  });

  it('sets FAILED and emits failure event when no active prompt exists, and re-throws', async () => {
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockRejectedValue(
      new NotFoundException(`Prompt not found for type: ${PROMPT_TYPE}`),
    );

    await expect(processor.process(makeJob(basePayload))).rejects.toThrow(NotFoundException);

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'failed',
      error: expect.any(String),
    });
  });

  it('sets FAILED and emits failure event on OpenAI error, and re-throws', async () => {
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(activePrompt);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockRejectedValue(new Error('OpenAI timeout'));

    await expect(processor.process(makeJob(basePayload))).rejects.toThrow('OpenAI timeout');

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', errorMessage: 'OpenAI timeout' }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'failed',
      error: 'OpenAI timeout',
    });
  });
});
