import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvExtractionService } from './cv-extraction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiService } from '../../ai/services/openai.service';
import type { CvStructuredData } from '@opticv/datatypes';

const mockStructuredData: CvStructuredData = {
  contact: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: 'Experienced engineer',
  experience: [],
  education: [],
  skills: ['TypeScript'],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
};

const makeDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 'cv-id',
  userId: 'user-id',
  parsedText: 'John Doe, Software Engineer...',
  extractionStatus: 'PENDING',
  structuredData: null,
  ...overrides,
});

const mockPrisma = {
  cvDocument: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
};

const mockOpenAiService = {
  extractCvData: jest.fn().mockResolvedValue(mockStructuredData),
};

describe('CvExtractionService', () => {
  let service: CvExtractionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvExtractionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OpenAiService, useValue: mockOpenAiService },
      ],
    }).compile();

    service = module.get<CvExtractionService>(CvExtractionService);
  });

  describe('extractStructuredData', () => {
    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.extractStructuredData('cv-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({ userId: 'other-user' }),
      );

      await expect(
        service.extractStructuredData('cv-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns cached structured data when extractionStatus is COMPLETED', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({
          extractionStatus: 'COMPLETED',
          structuredData: mockStructuredData,
        }),
      );

      const result = await service.extractStructuredData('cv-id', 'user-id');

      expect(mockOpenAiService.extractCvData).not.toHaveBeenCalled();
      expect(result).toEqual(mockStructuredData);
    });

    it('calls AI service and saves result when extraction is needed', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(makeDoc());

      const result = await service.extractStructuredData('cv-id', 'user-id');

      expect(mockOpenAiService.extractCvData).toHaveBeenCalledWith(
        'John Doe, Software Engineer...',
      );
      expect(mockPrisma.cvDocument.update).toHaveBeenCalledWith({
        where: { id: 'cv-id' },
        data: {
          structuredData: mockStructuredData,
          extractionStatus: 'COMPLETED',
        },
      });
      expect(result).toEqual(mockStructuredData);
    });

    it('resets extractionStatus to PENDING before calling AI when status is FAILED', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({ extractionStatus: 'FAILED' }),
      );

      await service.extractStructuredData('cv-id', 'user-id');

      const updateCalls = mockPrisma.cvDocument.update.mock.calls as Array<
        [{ where: unknown; data: unknown }]
      >;
      const pendingCall = updateCalls.find(
        ([arg]) =>
          (arg as { data: { extractionStatus?: string } }).data
            .extractionStatus === 'PENDING',
      );
      expect(pendingCall).toBeDefined();
    });

    it('does not set PENDING status when extractionStatus is already PENDING', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({ extractionStatus: 'PENDING' }),
      );

      await service.extractStructuredData('cv-id', 'user-id');

      const updateCalls = mockPrisma.cvDocument.update.mock.calls as Array<
        [{ where: unknown; data: unknown }]
      >;
      const pendingCall = updateCalls.find(
        ([arg]) =>
          (arg as { data: { extractionStatus?: string } }).data
            .extractionStatus === 'PENDING',
      );
      expect(pendingCall).toBeUndefined();
    });

    it('throws BadRequestException when parsedText is missing', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({ parsedText: null }),
      );

      await expect(
        service.extractStructuredData('cv-id', 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when parsedText is blank', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(
        makeDoc({ parsedText: '   ' }),
      );

      await expect(
        service.extractStructuredData('cv-id', 'user-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets extractionStatus to FAILED and throws BadGatewayException when AI service fails', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(makeDoc());
      mockOpenAiService.extractCvData.mockRejectedValueOnce(
        new Error('OpenAI timeout'),
      );

      await expect(
        service.extractStructuredData('cv-id', 'user-id'),
      ).rejects.toThrow(BadGatewayException);
      expect(mockPrisma.cvDocument.update).toHaveBeenCalledWith({
        where: { id: 'cv-id' },
        data: { extractionStatus: 'FAILED' },
      });
    });
  });
});
