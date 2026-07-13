import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { OptimizationService } from './optimization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QuotaService } from '../quota/quota.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { PromptType } from '../../generated/prisma/enums.js';

const CV_SUBSET_PROMPT_TYPES = [
  PromptType.RESUME_AUTOPSY,
  PromptType.KEYWORD_GAP,
  PromptType.SUMMARY_REWRITE,
  PromptType.BULLET_UPGRADE,
];

const mockPrisma = {
  jobApplication: {
    findUnique: jest.fn(),
  },
  optimizationResult: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findUnique: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn(),
};

const mockEventBus = {};

const mockQuotaService = {
  checkAndConsume: jest.fn(),
};

const baseJobApplication = {
  id: 'app-1',
  userId: 'user-1',
  jobDescription: 'Software Engineer at Acme',
  cvDocument: {
    parseStatus: 'COMPLETED',
    parsedText: 'My resume text',
    structuredData: { name: 'John' },
  },
};

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.subscription.findUnique.mockResolvedValue({ tier: 'FREE' });
    mockQuotaService.checkAndConsume.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: getQueueToken('optimization'), useValue: mockQueue },
        { provide: OptimizationEventBus, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get(OptimizationService);
  });

  describe('triggerOptimization', () => {
    it('throws ForbiddenException when job application is not found', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null);

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when userId does not match', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        userId: 'other-user',
      });

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when cvDocument is null', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        cvDocument: null,
      });

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        new BadRequestException('CV document is not yet parsed.'),
      );
    });

    it('throws BadRequestException when CV parseStatus is not COMPLETED', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        cvDocument: { ...baseJobApplication.cvDocument, parseStatus: 'PENDING' },
      });

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        new BadRequestException('CV document is not yet parsed.'),
      );
    });

    it('throws BadRequestException when jobDescription is empty', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        jobDescription: '   ',
      });

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        new BadRequestException('Job description is required.'),
      );
    });

    it('propagates quota rejection without creating records or enqueuing jobs', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockQuotaService.checkAndConsume.mockRejectedValue(
        new ForbiddenException({ code: 'QUOTA_EXCEEDED' }),
      );

      await expect(service.triggerOptimization('app-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPrisma.optimizationResult.upsert).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('checks and consumes one CV_OPTIMIZATION quota unit', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.upsert.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      await service.triggerOptimization('app-1', 'user-1');

      expect(mockQuotaService.checkAndConsume).toHaveBeenCalledTimes(1);
      expect(mockQuotaService.checkAndConsume).toHaveBeenCalledWith(
        'user-1',
        'CV_OPTIMIZATION',
        'FREE',
      );
    });

    it('creates 4 PENDING records for the CV subset, enqueues 4 jobs, and returns a runId', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.upsert.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      const result = await service.triggerOptimization('app-1', 'user-1');

      expect(result.runId).toBeDefined();
      expect(typeof result.runId).toBe('string');

      expect(mockPrisma.optimizationResult.upsert).toHaveBeenCalledTimes(
        CV_SUBSET_PROMPT_TYPES.length,
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(CV_SUBSET_PROMPT_TYPES.length);

      for (const promptType of CV_SUBSET_PROMPT_TYPES) {
        expect(mockPrisma.optimizationResult.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              applicationId_promptType: { applicationId: 'app-1', promptType },
            },
            create: expect.objectContaining({ status: 'PENDING', promptType }),
            update: expect.objectContaining({ status: 'PENDING' }),
          }),
        );
        expect(mockQueue.add).toHaveBeenCalledWith(
          'optimize',
          expect.objectContaining({ promptType, jobApplicationId: 'app-1' }),
          expect.objectContaining({ attempts: 2 }),
        );
      }

      for (const promptType of [
        PromptType.COVER_LETTER,
        PromptType.INTERVIEW_PREP,
        PromptType.LINKEDIN_REWRITE,
      ]) {
        expect(mockQueue.add).not.toHaveBeenCalledWith(
          'optimize',
          expect.objectContaining({ promptType }),
          expect.anything(),
        );
      }
    });
  });

  describe('triggerSingleJob', () => {
    const PROMPT_TYPE = PromptType.RESUME_AUTOPSY;
    const RUN_ID = 'existing-run-id';

    it('throws ForbiddenException when job application is not found', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when userId does not match', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        userId: 'other-user',
      });

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when cvDocument is null', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        cvDocument: null,
      });

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(new BadRequestException('CV document is not yet parsed.'));
    });

    it('throws BadRequestException when CV parseStatus is not COMPLETED', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        cvDocument: { ...baseJobApplication.cvDocument, parseStatus: 'PENDING' },
      });

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(new BadRequestException('CV document is not yet parsed.'));
    });

    it('throws BadRequestException when jobDescription is empty', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue({
        ...baseJobApplication,
        jobDescription: '   ',
      });

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(new BadRequestException('Job description is required.'));
    });

    it('propagates quota rejection without upserting or enqueuing', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockQuotaService.checkAndConsume.mockRejectedValue(
        new ForbiddenException({ code: 'QUOTA_EXCEEDED' }),
      );

      await expect(
        service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.optimizationResult.upsert).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it.each([
      [PromptType.RESUME_AUTOPSY, 'CV_OPTIMIZATION'],
      [PromptType.KEYWORD_GAP, 'CV_OPTIMIZATION'],
      [PromptType.SUMMARY_REWRITE, 'CV_OPTIMIZATION'],
      [PromptType.BULLET_UPGRADE, 'CV_OPTIMIZATION'],
      [PromptType.COVER_LETTER, 'COVER_LETTER'],
      [PromptType.INTERVIEW_PREP, 'INTERVIEW_PREP'],
      [PromptType.LINKEDIN_REWRITE, 'LINKEDIN'],
    ])(
      'maps %s to the %s feature before consuming quota',
      async (promptType, feature) => {
        mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
        mockPrisma.optimizationResult.upsert.mockResolvedValue({});
        mockQueue.add.mockResolvedValue({});

        await service.triggerSingleJob('app-1', promptType, RUN_ID, 'user-1');

        expect(mockQuotaService.checkAndConsume).toHaveBeenCalledWith(
          'user-1',
          feature,
          'FREE',
        );
      },
    );

    it('upserts one PENDING record, enqueues one job with the provided runId, and returns it', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.upsert.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      const result = await service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1');

      expect(result).toEqual({ runId: RUN_ID });

      expect(mockPrisma.optimizationResult.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.optimizationResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            applicationId_promptType: { applicationId: 'app-1', promptType: PROMPT_TYPE },
          },
          create: expect.objectContaining({ status: 'PENDING', promptType: PROMPT_TYPE }),
          update: expect.objectContaining({ status: 'PENDING' }),
        }),
      );

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'optimize',
        expect.objectContaining({
          runId: RUN_ID,
          promptType: PROMPT_TYPE,
          jobApplicationId: 'app-1',
          cvText: 'My resume text',
          jobDescription: 'Software Engineer at Acme',
        }),
        expect.objectContaining({ attempts: 2 }),
      );
    });

    it('does not enqueue jobs for other promptTypes', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.upsert.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      await service.triggerSingleJob('app-1', PROMPT_TYPE, RUN_ID, 'user-1');

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      const calledWith = mockQueue.add.mock.calls[0][1];
      expect(calledWith.promptType).toBe(PROMPT_TYPE);
    });
  });

  describe('retryFailedJob', () => {
    const PROMPT_TYPE = PromptType.RESUME_AUTOPSY;

    it('throws ForbiddenException when job application is not found', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.retryFailedJob('app-1', PROMPT_TYPE, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the result row does not exist', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.findUnique.mockResolvedValue(null);

      await expect(
        service.retryFailedJob('app-1', PROMPT_TYPE, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the result row is COMPLETED', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        status: 'COMPLETED',
      });

      await expect(
        service.retryFailedJob('app-1', PROMPT_TYPE, 'user-1'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.optimizationResult.update).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('does not call checkAndConsume', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        status: 'FAILED',
      });
      mockPrisma.optimizationResult.update.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      await service.retryFailedJob('app-1', PROMPT_TYPE, 'user-1');

      expect(mockQuotaService.checkAndConsume).not.toHaveBeenCalled();
    });

    it('resets the FAILED row to PENDING and re-enqueues it', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        status: 'FAILED',
      });
      mockPrisma.optimizationResult.update.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      const result = await service.retryFailedJob('app-1', PROMPT_TYPE, 'user-1');

      expect(result.runId).toBeDefined();
      expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'result-1' },
          data: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'optimize',
        expect.objectContaining({ promptType: PROMPT_TYPE, jobApplicationId: 'app-1' }),
        expect.objectContaining({ attempts: 2 }),
      );
    });
  });

  describe('saveUserOutput', () => {
    it('throws ForbiddenException when record is not found', async () => {
      mockPrisma.optimizationResult.findUnique.mockResolvedValue(null);

      await expect(service.saveUserOutput('result-1', 'edited', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when userId does not match', async () => {
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        application: { userId: 'other-user' },
      });

      await expect(service.saveUserOutput('result-1', 'edited', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('saves the output and returns userEditedOutput', async () => {
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        application: { userId: 'user-1' },
      });
      mockPrisma.optimizationResult.update.mockResolvedValue({ userEditedOutput: 'edited' });

      const result = await service.saveUserOutput('result-1', 'edited', 'user-1');

      expect(result).toEqual({ userEditedOutput: 'edited' });
      expect(mockPrisma.optimizationResult.update).toHaveBeenCalledWith({
        where: { id: 'result-1' },
        data: { userEditedOutput: 'edited' },
        select: { userEditedOutput: true },
      });
    });

    it('allows saving an empty string', async () => {
      mockPrisma.optimizationResult.findUnique.mockResolvedValue({
        id: 'result-1',
        application: { userId: 'user-1' },
      });
      mockPrisma.optimizationResult.update.mockResolvedValue({ userEditedOutput: '' });

      const result = await service.saveUserOutput('result-1', '', 'user-1');

      expect(result).toEqual({ userEditedOutput: '' });
    });
  });
});
