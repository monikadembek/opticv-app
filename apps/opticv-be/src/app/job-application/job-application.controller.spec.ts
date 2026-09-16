import { CanActivate, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationController } from './job-application.controller';
import { JobApplicationService } from './job-application.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { JobApplicationListResponse, JobApplicationResponse } from '@opticv/datatypes';
import type { UserModel } from '../../generated/prisma/models.js';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockApp: JobApplicationResponse = {
  id: 'app-id',
  userId: 'user-id',
  cvDocumentId: 'cv-id',
  jobTitle: 'Engineer',
  companyName: 'Acme',
  jobDescription: 'Build things',
  atsScore: null,
  notes: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockListResponse: JobApplicationListResponse = {
  data: [
    {
      id: mockApp.id,
      userId: mockApp.userId,
      cvDocumentId: mockApp.cvDocumentId,
      jobTitle: mockApp.jobTitle,
      companyName: mockApp.companyName,
      atsScore: mockApp.atsScore,
      createdAt: mockApp.createdAt,
      updatedAt: mockApp.updatedAt,
    },
  ],
  total: 1,
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockApp),
  findAll: jest.fn().mockResolvedValue(mockListResponse),
  findOne: jest.fn().mockResolvedValue(mockApp),
  update: jest.fn().mockResolvedValue(mockApp),
  updateAtsScore: jest.fn().mockResolvedValue(mockApp),
  remove: jest.fn().mockResolvedValue(undefined),
};

const mockUser = {
  id: 'user-id',
  supabaseId: 'sb-id',
  email: 'test@example.com',
} as unknown as UserModel;

describe('JobApplicationController', () => {
  let controller: JobApplicationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobApplicationController],
      providers: [{ provide: JobApplicationService, useValue: mockService }],
    })
      .overrideGuard(SupabaseGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<JobApplicationController>(JobApplicationController);
  });

  describe('create', () => {
    const dto = {
      cvDocumentId: 'cv-id',
      jobTitle: 'Engineer',
      companyName: 'Acme',
      jobDescription: 'Build things',
    };

    it('delegates to service.create with dto and userId', async () => {
      const result = await controller.create(dto as never, mockUser);
      expect(mockService.create).toHaveBeenCalledWith(dto, mockUser.id);
      expect(result).toEqual(mockApp);
    });

    it('propagates errors thrown by service', async () => {
      mockService.create.mockRejectedValueOnce(new NotFoundException('CV document not found.'));
      await expect(controller.create(dto as never, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('delegates to service.findAll with userId and query', async () => {
      const result = await controller.findAll({ limit: 10, offset: 0 }, mockUser);
      expect(mockService.findAll).toHaveBeenCalledWith(mockUser.id, { limit: 10, offset: 0 });
      expect(result).toEqual(mockListResponse);
    });

    it('propagates errors thrown by service', async () => {
      mockService.findAll.mockRejectedValueOnce(new Error('db error'));
      await expect(controller.findAll({}, mockUser)).rejects.toThrow('db error');
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with id and userId', async () => {
      const result = await controller.findOne('app-id', mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith('app-id', mockUser.id);
      expect(result).toEqual(mockApp);
    });

    it('propagates errors thrown by service', async () => {
      mockService.findOne.mockRejectedValueOnce(new NotFoundException('Job application not found.'));
      await expect(controller.findOne('missing-id', mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAtsScore', () => {
    it('delegates to service.updateAtsScore with id, dto and userId', async () => {
      const result = await controller.updateAtsScore('app-id', { atsScore: 75 } as never, mockUser);
      expect(mockService.updateAtsScore).toHaveBeenCalledWith('app-id', { atsScore: 75 }, mockUser.id);
      expect(result).toEqual(mockApp);
    });

    it('propagates errors thrown by service', async () => {
      mockService.updateAtsScore.mockRejectedValueOnce(new NotFoundException('Job application not found.'));
      await expect(
        controller.updateAtsScore('missing-id', { atsScore: 75 } as never, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('delegates to service.update with id, dto and userId', async () => {
      const dto = { jobTitle: 'Senior Engineer' };
      const result = await controller.update('app-id', dto as never, mockUser);
      expect(mockService.update).toHaveBeenCalledWith('app-id', dto, mockUser.id);
      expect(result).toEqual(mockApp);
    });

    it('propagates errors thrown by service', async () => {
      mockService.update.mockRejectedValueOnce(new NotFoundException('Job application not found.'));
      await expect(
        controller.update('missing-id', {} as never, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('delegates to service.remove with id and userId', async () => {
      await controller.remove('app-id', mockUser);
      expect(mockService.remove).toHaveBeenCalledWith('app-id', mockUser.id);
    });

    it('propagates errors thrown by service', async () => {
      mockService.remove.mockRejectedValueOnce(new NotFoundException('Job application not found.'));
      await expect(controller.remove('missing-id', mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
