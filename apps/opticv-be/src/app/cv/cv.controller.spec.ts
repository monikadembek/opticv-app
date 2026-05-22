import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvExtractionService } from './services/cv-extraction.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { CvDocumentListItem, UploadCvResponse } from '@opticv/datatypes';
import type { UserModel } from '../../generated/prisma/models.js';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockUploadResponse: UploadCvResponse = {
  id: 'doc-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  storageKey: 'uploads/user-id/uuid.pdf',
  createdAt: new Date('2024-01-01'),
  parseStatus: 'COMPLETED',
};

const mockListItem: CvDocumentListItem = {
  id: 'doc-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01'),
  parsedText: null,
  parseStatus: 'PENDING',
};

const mockCvService = {
  uploadCv: jest.fn().mockResolvedValue(mockUploadResponse),
  getUserCvs: jest.fn().mockResolvedValue([mockListItem]),
  getDownloadUrl: jest
    .fn()
    .mockResolvedValue({ url: 'https://signed.url/file.pdf' }),
  deleteCv: jest.fn().mockResolvedValue(undefined),
  getStructuredData: jest.fn().mockResolvedValue({ data: {} }),
};

const mockCvExtractionService = {
  extractStructuredData: jest.fn().mockResolvedValue({}),
};

function makeFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'cv.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('pdf content'),
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

const mockUser = {
  id: 'user-id',
  supabaseId: 'sb-id',
  email: 'test@example.com',
} as unknown as UserModel;

describe('CvController', () => {
  let controller: CvController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CvController],
      providers: [
        { provide: CvService, useValue: mockCvService },
        { provide: CvExtractionService, useValue: mockCvExtractionService },
      ],
    })
      .overrideGuard(SupabaseGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<CvController>(CvController);
  });

  describe('uploadCv', () => {
    it('delegates to CvService.uploadCv with file and userId', async () => {
      const file = makeFile();
      const result = await controller.uploadCv(file, mockUser);

      expect(mockCvService.uploadCv).toHaveBeenCalledWith(file, mockUser.id);
      expect(result).toEqual(mockUploadResponse);
    });

    it('propagates errors thrown by CvService', async () => {
      mockCvService.uploadCv.mockRejectedValueOnce(new Error('service error'));
      const file = makeFile();

      await expect(controller.uploadCv(file, mockUser)).rejects.toThrow(
        'service error',
      );
    });
  });

  describe('getUserCvs', () => {
    it('delegates to CvService.getUserCvs with userId and returns list', async () => {
      const result = await controller.getUserCvs(mockUser);

      expect(mockCvService.getUserCvs).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([mockListItem]);
    });
  });

  describe('getDownloadUrl', () => {
    it('delegates to CvService.getDownloadUrl with id and userId', async () => {
      const result = await controller.getDownloadUrl('doc-id', mockUser);

      expect(mockCvService.getDownloadUrl).toHaveBeenCalledWith(
        'doc-id',
        mockUser.id,
      );
      expect(result).toEqual({ url: 'https://signed.url/file.pdf' });
    });
  });

  describe('deleteCv', () => {
    it('delegates to CvService.deleteCv with id and userId', async () => {
      await controller.deleteCv('doc-id', mockUser);

      expect(mockCvService.deleteCv).toHaveBeenCalledWith(
        'doc-id',
        mockUser.id,
      );
    });
  });

  describe('getStructuredData', () => {
    it('delegates to CvService.getStructuredData and returns the result', async () => {
      const structuredData = { contact: { name: 'Jane' } };
      mockCvService.getStructuredData = jest
        .fn()
        .mockResolvedValueOnce({ data: structuredData });

      const result = await controller.getStructuredData('doc-id', mockUser);

      expect(mockCvService.getStructuredData).toHaveBeenCalledWith(
        'doc-id',
        mockUser.id,
      );
      expect(result).toEqual({ data: structuredData });
    });

    it('propagates errors thrown by CvService', async () => {
      mockCvService.getStructuredData = jest
        .fn()
        .mockRejectedValueOnce(new Error('not found'));

      await expect(
        controller.getStructuredData('doc-id', mockUser),
      ).rejects.toThrow('not found');
    });
  });

  describe('extractCv', () => {
    it('delegates to CvExtractionService.extractStructuredData and wraps result in data envelope', async () => {
      const structuredData = { contact: { name: 'Jane' } };
      mockCvExtractionService.extractStructuredData.mockResolvedValueOnce(
        structuredData,
      );

      const result = await controller.extractCv('doc-id', mockUser);

      expect(
        mockCvExtractionService.extractStructuredData,
      ).toHaveBeenCalledWith('doc-id', mockUser.id);
      expect(result).toEqual({ data: structuredData });
    });

    it('propagates errors thrown by CvExtractionService', async () => {
      mockCvExtractionService.extractStructuredData.mockRejectedValueOnce(
        new Error('extraction failed'),
      );

      await expect(controller.extractCv('doc-id', mockUser)).rejects.toThrow(
        'extraction failed',
      );
    });
  });
});
