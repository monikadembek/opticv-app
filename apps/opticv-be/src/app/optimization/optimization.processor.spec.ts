import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { OptimizationProcessor } from './optimization.processor.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenAiService } from '../ai/services/openai.service.js';
import { PromptService } from '../ai/services/prompt.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { PromptType } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';
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
};

const makeJob = (data: OptimizationJobPayload) => ({ data } as Job<OptimizationJobPayload>);

const activePrompt = {
  id: 'pv-1',
  systemPrompt: 'You are a CV reviewer.',
  userPromptTemplate: '{{SHARED_CONTEXT}}',
  modelPreference: 'gpt-4o-mini',
  outputSchema: null,
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
        { provide: getQueueToken('optimization'), useValue: {} },
      ],
    }).compile();

    processor = module.get(OptimizationProcessor);
  });

  it('happy path: sets PROCESSING, calls OpenAI, sets COMPLETED, emits success event', async () => {
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(activePrompt);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockResolvedValue({
      content: 'Analysis result',
      promptTokens: 100,
      completionTokens: 50,
    });

    await processor.process(makeJob(basePayload));

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PROCESSING' } }),
    );
    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED', textOutput: 'Analysis result' }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'completed',
      result: 'Analysis result',
    });
  });

  it('stores structuredOutput and clears textOutput when outputSchema is non-null', async () => {
    const structuredPrompt = { ...activePrompt, outputSchema: { type: 'object' } };
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(structuredPrompt);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockResolvedValue({
      content: '{"score": 85}',
      promptTokens: 100,
      completionTokens: 50,
    });

    await processor.process(makeJob(basePayload));

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          structuredOutput: { score: 85 },
          textOutput: null,
        }),
      }),
    );
    expect(mockEventBus.emit).toHaveBeenCalledWith('run-1', {
      promptType: PROMPT_TYPE,
      status: 'completed',
      result: { score: 85 },
    });
  });

  it('stores textOutput and clears structuredOutput when outputSchema is null', async () => {
    mockPrisma.optimizationResult.update.mockResolvedValue({});
    mockPromptService.getActivePrompt.mockResolvedValue(activePrompt);
    mockPromptService.buildUserPrompt.mockReturnValue('built prompt');
    mockOpenAiService.generateCompletion.mockResolvedValue({
      content: 'Plain text result',
      promptTokens: 80,
      completionTokens: 40,
    });

    await processor.process(makeJob(basePayload));

    expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          structuredOutput: Prisma.DbNull,
          textOutput: 'Plain text result',
        }),
      }),
    );
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
