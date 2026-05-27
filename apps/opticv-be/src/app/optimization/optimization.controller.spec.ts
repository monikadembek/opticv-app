import { BadRequestException, CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OptimizationController } from './optimization.controller';
import { OptimizationService } from './optimization.service';
import { OptimizationEventBus } from './optimization-event-bus';
import { SupabaseGuard } from '../auth/supabase.guard';
import { AiThrottlerGuard } from '../throttler/ai-throttler.guard';
import type { UserModel } from '../../generated/prisma/models';
import { PromptType } from '../../generated/prisma/enums';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockUser = {
  id: 'user-id',
  supabaseId: 'sb-id',
  email: 'test@example.com',
} as unknown as UserModel;

const mockOptimizationService = {
  triggerOptimization: jest.fn().mockResolvedValue({ runId: 'run-1' }),
  triggerSingleJob: jest.fn().mockResolvedValue({ runId: 'run-1' }),
  validateStreamAccess: jest.fn().mockResolvedValue(undefined),
  saveUserOutput: jest.fn().mockResolvedValue({ userEditedOutput: 'edited' }),
};

const mockEventBus = {
  subscribe: jest.fn().mockReturnValue(() => {}),
};

describe('OptimizationController', () => {
  let controller: OptimizationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OptimizationController],
      providers: [
        { provide: OptimizationService, useValue: mockOptimizationService },
        { provide: OptimizationEventBus, useValue: mockEventBus },
      ],
    })
      .overrideGuard(SupabaseGuard)
      .useValue(allowAllGuard)
      .overrideGuard(AiThrottlerGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<OptimizationController>(OptimizationController);
  });

  describe('triggerOptimization', () => {
    it('delegates to OptimizationService and returns runId', async () => {
      const result = await controller.triggerOptimization('app-1', mockUser);

      expect(mockOptimizationService.triggerOptimization).toHaveBeenCalledWith(
        'app-1',
        mockUser.id,
      );
      expect(result).toEqual({ runId: 'run-1' });
    });
  });

  describe('triggerSingleJob', () => {
    it('delegates to OptimizationService with valid promptType and returns runId', async () => {
      const result = await controller.triggerSingleJob(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        { runId: 'run-1' },
        mockUser,
      );

      expect(mockOptimizationService.triggerSingleJob).toHaveBeenCalledWith(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        'run-1',
        mockUser.id,
      );
      expect(result).toEqual({ runId: 'run-1' });
    });

    it('throws BadRequestException for an invalid promptType', async () => {
      await expect(
        controller.triggerSingleJob('app-1', 'INVALID_TYPE', {}, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('trims whitespace from runId before passing to service', async () => {
      await controller.triggerSingleJob(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        { runId: '  run-1  ' },
        mockUser,
      );

      expect(mockOptimizationService.triggerSingleJob).toHaveBeenCalledWith(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        'run-1',
        mockUser.id,
      );
    });
  });

  describe('saveUserOutput', () => {
    it('delegates to OptimizationService and returns userEditedOutput', async () => {
      const result = await controller.saveUserOutput(
        'result-1',
        { userEditedOutput: 'edited text' },
        mockUser,
      );

      expect(mockOptimizationService.saveUserOutput).toHaveBeenCalledWith(
        'result-1',
        'edited text',
        mockUser.id,
      );
      expect(result).toEqual({ userEditedOutput: 'edited' });
    });

    it('allows saving an empty string', async () => {
      mockOptimizationService.saveUserOutput.mockResolvedValueOnce({
        userEditedOutput: '',
      });

      const result = await controller.saveUserOutput(
        'result-1',
        { userEditedOutput: '' },
        mockUser,
      );

      expect(result).toEqual({ userEditedOutput: '' });
    });

    it('propagates errors thrown by OptimizationService', async () => {
      mockOptimizationService.saveUserOutput.mockRejectedValueOnce(
        new Error('forbidden'),
      );

      await expect(
        controller.saveUserOutput('result-1', { userEditedOutput: 'text' }, mockUser),
      ).rejects.toThrow('forbidden');
    });
  });
});
