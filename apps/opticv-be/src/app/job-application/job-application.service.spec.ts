import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobApplicationService } from './job-application.service';
import { PrismaService } from '../prisma/prisma.service';

const mockApp = {
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

const mockCv = {
  id: 'cv-id',
  userId: 'user-id',
};

const mockPrisma = {
  cvDocument: {
    findUnique: jest.fn().mockResolvedValue(mockCv),
  },
  jobApplication: {
    create: jest.fn().mockResolvedValue(mockApp),
    count: jest.fn().mockResolvedValue(1),
    findMany: jest.fn().mockResolvedValue([
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
    ]),
    findUnique: jest.fn().mockResolvedValue(mockApp),
    update: jest.fn().mockResolvedValue(mockApp),
    delete: jest.fn().mockResolvedValue(mockApp),
  },
};

describe('JobApplicationService', () => {
  let service: JobApplicationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobApplicationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JobApplicationService>(JobApplicationService);
  });

  describe('create', () => {
    const dto = {
      cvDocumentId: 'cv-id',
      jobTitle: 'Engineer',
      companyName: 'Acme',
      jobDescription: 'Build things',
    };

    it('creates and returns the job application when CV belongs to user', async () => {
      const result = await service.create(dto, 'user-id');
      expect(mockPrisma.cvDocument.findUnique).toHaveBeenCalledWith({ where: { id: 'cv-id' } });
      expect(mockPrisma.jobApplication.create).toHaveBeenCalledWith({
        data: { ...dto, userId: 'user-id' },
      });
      expect(result).toEqual(mockApp);
    });

    it('throws NotFoundException when CV does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(dto, 'user-id')).rejects.toThrow(
        new NotFoundException('CV document not found.'),
      );
    });

    it('throws NotFoundException when CV belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({ ...mockCv, userId: 'other-user' });
      await expect(service.create(dto, 'user-id')).rejects.toThrow(
        new NotFoundException('CV document not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('returns data and total for the user', async () => {
      const result = await service.findAll('user-id', {});
      expect(mockPrisma.jobApplication.count).toHaveBeenCalledWith({ where: { userId: 'user-id' } });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('applies take when limit is provided', async () => {
      await service.findAll('user-id', { limit: 10 });
      expect(mockPrisma.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('applies skip when offset is provided', async () => {
      await service.findAll('user-id', { offset: 5 });
      expect(mockPrisma.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5 }),
      );
    });

    it('omits take when limit is undefined', async () => {
      await service.findAll('user-id', {});
      const call = mockPrisma.jobApplication.findMany.mock.calls[0][0] as Record<string, unknown>;
      expect(call).not.toHaveProperty('take');
    });

    it('returns empty data and zero total when user has no applications', async () => {
      mockPrisma.jobApplication.count.mockResolvedValueOnce(0);
      mockPrisma.jobApplication.findMany.mockResolvedValueOnce([]);
      const result = await service.findAll('user-id', {});
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('returns the record when it exists and belongs to the user', async () => {
      const result = await service.findOne('app-id', 'user-id');
      expect(result).toEqual(mockApp);
    });

    it('throws NotFoundException when record does not exist', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing-id', 'user-id')).rejects.toThrow(
        new NotFoundException('Job application not found.'),
      );
    });

    it('throws NotFoundException when record belongs to another user', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValueOnce({ ...mockApp, userId: 'other-user' });
      await expect(service.findOne('app-id', 'user-id')).rejects.toThrow(
        new NotFoundException('Job application not found.'),
      );
    });
  });

  describe('update', () => {
    const dto = { jobTitle: 'Senior Engineer' };

    it('updates and returns the record', async () => {
      const result = await service.update('app-id', dto, 'user-id');
      expect(mockPrisma.jobApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-id' },
        data: dto,
      });
      expect(result).toEqual(mockApp);
    });

    it('validates new cvDocumentId ownership when provided', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({ id: 'new-cv', userId: 'other-user' });
      await expect(
        service.update('app-id', { cvDocumentId: 'new-cv' }, 'user-id'),
      ).rejects.toThrow(new NotFoundException('CV document not found.'));
    });

    it('throws NotFoundException when application does not belong to user', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValueOnce({ ...mockApp, userId: 'other-user' });
      await expect(service.update('app-id', dto, 'user-id')).rejects.toThrow(
        new NotFoundException('Job application not found.'),
      );
    });
  });

  describe('updateAtsScore', () => {
    it('updates only atsScore and returns the record', async () => {
      const result = await service.updateAtsScore('app-id', { atsScore: 85 }, 'user-id');
      expect(mockPrisma.jobApplication.update).toHaveBeenCalledWith({
        where: { id: 'app-id' },
        data: { atsScore: 85 },
      });
      expect(result).toEqual(mockApp);
    });

    it('throws NotFoundException when application does not belong to user', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValueOnce({ ...mockApp, userId: 'other-user' });
      await expect(service.updateAtsScore('app-id', { atsScore: 85 }, 'user-id')).rejects.toThrow(
        new NotFoundException('Job application not found.'),
      );
    });
  });

  describe('remove', () => {
    it('deletes the record', async () => {
      await service.remove('app-id', 'user-id');
      expect(mockPrisma.jobApplication.delete).toHaveBeenCalledWith({ where: { id: 'app-id' } });
    });

    it('throws NotFoundException when application does not belong to user', async () => {
      mockPrisma.jobApplication.findUnique.mockResolvedValueOnce({ ...mockApp, userId: 'other-user' });
      await expect(service.remove('app-id', 'user-id')).rejects.toThrow(
        new NotFoundException('Job application not found.'),
      );
    });
  });
});
