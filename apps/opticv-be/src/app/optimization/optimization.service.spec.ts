import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { OptimizationService } from './optimization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OptimizationEventBus } from './optimization-event-bus.js';
import { PromptType } from '../../generated/prisma/enums.js';

const mockPrisma = {
  jobApplication: {
    findUnique: jest.fn(),
  },
  optimizationResult: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockQueue = {
  add: jest.fn(),
};

const mockEventBus = {};

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptimizationService,
        { provide: PrismaService, useValue: mockPrisma },
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

    it('creates 7 PENDING records, enqueues 7 jobs, and returns a runId', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValue(baseJobApplication);
      mockPrisma.optimizationResult.upsert.mockResolvedValue({});
      mockQueue.add.mockResolvedValue({});

      const result = await service.triggerOptimization('app-1', 'user-1');

      expect(result.runId).toBeDefined();
      expect(typeof result.runId).toBe('string');

      const allPromptTypes = Object.values(PromptType);
      expect(mockPrisma.optimizationResult.upsert).toHaveBeenCalledTimes(
        allPromptTypes.length,
      );
      expect(mockQueue.add).toHaveBeenCalledTimes(allPromptTypes.length);

      for (const promptType of allPromptTypes) {
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
