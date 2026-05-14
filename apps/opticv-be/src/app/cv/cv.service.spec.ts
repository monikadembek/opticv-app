import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvService } from './cv.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from './r2.service';

const mockDoc = {
  id: 'doc-id',
  userId: 'user-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  storageKey: 'uploads/user-id/uuid.pdf',
  createdAt: new Date('2024-01-01'),
};

const mockPrisma = {
  cvDocument: {
    create: jest.fn().mockResolvedValue(mockDoc),
  },
};

const mockR2 = {
  upload: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
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

describe('CvService', () => {
  let service: CvService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: R2Service, useValue: mockR2 },
      ],
    }).compile();

    service = module.get<CvService>(CvService);
  });

  describe('uploadCv', () => {
    it('throws BadRequestException when no file is provided', async () => {
      await expect(service.uploadCv(undefined, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for disallowed MIME type', async () => {
      const file = makeFile({ mimetype: 'image/png' });
      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when file exceeds 5 MB', async () => {
      const file = makeFile({ size: 5 * 1024 * 1024 + 1 });
      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts PDF files and returns UploadCvResponse', async () => {
      const file = makeFile();
      const result = await service.uploadCv(file, 'user-id');

      expect(mockR2.upload).toHaveBeenCalledTimes(1);
      expect(mockPrisma.cvDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          fileName: 'cv.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          parsedText: null,
          isActive: true,
        }),
      });
      expect(result).toEqual({
        id: mockDoc.id,
        fileName: mockDoc.fileName,
        fileSize: mockDoc.fileSize,
        mimeType: mockDoc.mimeType,
        storageKey: mockDoc.storageKey,
        createdAt: mockDoc.createdAt,
      });
    });

    it('accepts DOCX files', async () => {
      const file = makeFile({
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'cv.docx',
      });
      mockPrisma.cvDocument.create.mockResolvedValueOnce({
        ...mockDoc,
        mimeType: file.mimetype,
        fileName: 'cv.docx',
      });

      const result = await service.uploadCv(file, 'user-id');

      expect(mockR2.upload).toHaveBeenCalledTimes(1);
      const [key] = mockR2.upload.mock.calls[0] as [string, ...unknown[]];
      expect(key).toMatch(/\.docx$/);
      expect(result.mimeType).toBe(file.mimetype);
    });

    it('storage key encodes the userId and uses the correct extension', async () => {
      const file = makeFile();
      await service.uploadCv(file, 'user-123');

      const [key] = mockR2.upload.mock.calls[0] as [string, ...unknown[]];
      expect(key).toMatch(/^uploads\/user-123\/.+\.pdf$/);
    });

    it('deletes the R2 object and throws InternalServerErrorException when DB create fails', async () => {
      mockPrisma.cvDocument.create.mockRejectedValueOnce(new Error('db error'));
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockR2.delete).toHaveBeenCalledTimes(1);
    });

    it('still throws InternalServerErrorException even when R2 delete also fails', async () => {
      mockPrisma.cvDocument.create.mockRejectedValueOnce(new Error('db error'));
      mockR2.delete.mockRejectedValueOnce(new Error('delete error'));
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
