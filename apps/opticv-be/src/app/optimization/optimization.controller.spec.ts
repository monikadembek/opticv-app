import { EventEmitter } from 'events';
import { BadRequestException, CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import {
  OptimizationController,
  STREAM_IDLE_TIMEOUT_MS,
} from './optimization.controller';
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
  retryFailedJob: jest.fn().mockResolvedValue({ runId: 'run-1' }),
  validateStreamAccess: jest.fn().mockResolvedValue(undefined),
  saveUserOutput: jest.fn().mockResolvedValue({ userEditedOutput: 'edited' }),
};

const mockEventBus = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- unsubscribe no-op stub
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

  describe('retryFailedJob', () => {
    it('delegates to OptimizationService and returns runId', async () => {
      const result = await controller.retryFailedJob(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        mockUser,
      );

      expect(mockOptimizationService.retryFailedJob).toHaveBeenCalledWith(
        'app-1',
        PromptType.RESUME_AUTOPSY,
        mockUser.id,
      );
      expect(result).toEqual({ runId: 'run-1' });
    });

    it('throws BadRequestException for an invalid promptType', async () => {
      await expect(
        controller.retryFailedJob('app-1', 'INVALID_TYPE', mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('propagates errors thrown by OptimizationService', async () => {
      mockOptimizationService.retryFailedJob.mockRejectedValueOnce(
        new BadRequestException('Only a failed result can be retried for free'),
      );

      await expect(
        controller.retryFailedJob('app-1', PromptType.RESUME_AUTOPSY, mockUser),
      ).rejects.toThrow(BadRequestException);
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
        controller.saveUserOutput(
          'result-1',
          { userEditedOutput: 'text' },
          mockUser,
        ),
      ).rejects.toThrow('forbidden');
    });
  });

  describe('streamOptimization', () => {
    const RUN_ID = 'run-1';

    let bus: OptimizationEventBus;
    let streamController: OptimizationController;
    let req: EventEmitter;
    let res: {
      writableEnded: boolean;
      chunks: string[];
      setHeader: jest.Mock;
      flushHeaders: jest.Mock;
      write: jest.Mock;
      end: jest.Mock;
    };

    const runCompletePayloads = () =>
      res.chunks
        .filter((c) => c.startsWith('event: run-complete'))
        .map((c) => JSON.parse(c.split('data: ')[1]) as { timedOut: boolean });

    const jobCompleteCount = () =>
      res.chunks.filter((c) => c.startsWith('event: job-complete')).length;

    const listenerCount = () =>
      (bus as unknown as { emitter: EventEmitter }).emitter.listenerCount(
        `run:${RUN_ID}`,
      );

    const openStream = () =>
      streamController.streamOptimization(
        'app-1',
        RUN_ID,
        mockUser,
        req as unknown as Request,
        res as unknown as Response,
      );

    beforeEach(() => {
      jest.useFakeTimers();
      bus = new OptimizationEventBus();
      streamController = new OptimizationController(
        mockOptimizationService as unknown as OptimizationService,
        bus,
      );
      req = new EventEmitter();
      res = {
        writableEnded: false,
        chunks: [],
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn((chunk: string) => {
          res.chunks.push(chunk);
          return true;
        }),
        end: jest.fn(() => {
          res.writableEnded = true;
        }),
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('ends the response only after every queued prompt type has reported', async () => {
      bus.registerRun(RUN_ID, 4);
      await openStream();

      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
      });
      bus.emit(RUN_ID, {
        promptType: PromptType.KEYWORD_GAP,
        status: 'completed',
      });
      bus.emit(RUN_ID, {
        promptType: PromptType.SUMMARY_REWRITE,
        status: 'completed',
      });
      expect(res.end).not.toHaveBeenCalled();

      bus.emit(RUN_ID, {
        promptType: PromptType.BULLET_UPGRADE,
        status: 'completed',
      });

      expect(jobCompleteCount()).toBe(4);
      expect(runCompletePayloads()).toEqual([
        expect.objectContaining({ timedOut: false }),
      ]);
      expect(res.end).toHaveBeenCalledTimes(1);
      expect(listenerCount()).toBe(0);
      expect(bus.isRunComplete(RUN_ID)).toBe(false);
    });

    it('does not end the run early on a duplicate terminal event for the same prompt type', async () => {
      bus.registerRun(RUN_ID, 2);
      await openStream();

      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'failed',
      });
      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'failed',
      });
      expect(res.end).not.toHaveBeenCalled();

      bus.emit(RUN_ID, {
        promptType: PromptType.KEYWORD_GAP,
        status: 'completed',
      });
      expect(res.end).toHaveBeenCalledTimes(1);
    });

    it('reaches completion when a job fails', async () => {
      bus.registerRun(RUN_ID, 1);
      await openStream();

      bus.emit(RUN_ID, {
        promptType: PromptType.COVER_LETTER,
        status: 'failed',
        error: 'boom',
      });

      expect(runCompletePayloads()).toEqual([
        expect.objectContaining({ timedOut: false }),
      ]);
      expect(res.end).toHaveBeenCalledTimes(1);
    });

    it('ends the response on idle timeout and marks the payload as timed out', async () => {
      bus.registerRun(RUN_ID, 4);
      await openStream();

      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
      });
      jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS - 1);
      expect(res.end).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);

      expect(runCompletePayloads()).toEqual([
        expect.objectContaining({ timedOut: true }),
      ]);
      expect(res.end).toHaveBeenCalledTimes(1);
      expect(listenerCount()).toBe(0);
    });

    it('resets the idle timer on every event for the run', async () => {
      bus.registerRun(RUN_ID, 3);
      await openStream();

      jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS - 1);
      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
      });
      jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS - 1);

      expect(res.end).not.toHaveBeenCalled();
    });

    it('unsubscribes, clears the timer and releases the run when the client disconnects', async () => {
      bus.registerRun(RUN_ID, 4);
      bus.emit(RUN_ID, {
        promptType: PromptType.RESUME_AUTOPSY,
        status: 'completed',
      });
      await openStream();
      expect(listenerCount()).toBe(1);

      req.emit('close');

      expect(listenerCount()).toBe(0);
      jest.advanceTimersByTime(STREAM_IDLE_TIMEOUT_MS);
      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();

      // The run was released: re-registering starts from an empty seen set.
      bus.registerRun(RUN_ID, 1);
      expect(bus.isRunComplete(RUN_ID)).toBe(false);
    });

    it('rejects a missing runId', async () => {
      await expect(
        streamController.streamOptimization(
          'app-1',
          '  ',
          mockUser,
          req as unknown as Request,
          res as unknown as Response,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
