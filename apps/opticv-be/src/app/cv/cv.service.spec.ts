import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvService } from './cv.service';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { CvParserService } from './services/cv-parser.service';
import { QuotaService } from '../quota/quota.service';
import type { CvStructuredData } from '@opticv/datatypes';

const mockDoc = {
  id: 'doc-id',
  userId: 'user-id',
  name: 'cv',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  storageKey: 'uploads/user-id/uuid.pdf',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  parsedText: 'parsed text',
  parseStatus: 'COMPLETED' as const,
  extractionStatus: 'PENDING' as const,
  manuallyEdited: false,
};

const mockStructuredData: CvStructuredData = {
  contact: {
    name: 'Jane',
    position: null,
    email: null,
    phone: null,
    location: null,
    linkedin: null,
    website: null,
  },
  summary: null,
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
  other: null,
  gdprClause: null,
};

const mockPrisma = {
  cvDocument: {
    create: jest.fn().mockResolvedValue(mockDoc),
    update: jest.fn().mockResolvedValue(mockDoc),
    findMany: jest.fn().mockResolvedValue([mockDoc]),
    findUnique: jest.fn().mockResolvedValue(mockDoc),
    delete: jest.fn().mockResolvedValue(mockDoc),
    count: jest.fn().mockResolvedValue(0),
  },
  subscription: {
    findUnique: jest.fn().mockResolvedValue({ tier: 'FREE' }),
  },
};

const mockR2 = {
  upload: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
  getPresignedUrl: jest.fn().mockResolvedValue('https://signed.url/file.pdf'),
};

const mockQuotaService = {
  checkAndConsume: jest.fn().mockResolvedValue(undefined),
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
        {
          provide: CvParserService,
          useValue: { parse: jest.fn().mockResolvedValue('parsed text') },
        },
        { provide: QuotaService, useValue: mockQuotaService },
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

    it('accepts PDF files, skips parsing, and returns UploadCvResponse with COMPLETED status immediately', async () => {
      const parseSpy = jest.fn().mockResolvedValue('parsed text');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CvService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: R2Service, useValue: mockR2 },
          { provide: CvParserService, useValue: { parse: parseSpy } },
          { provide: QuotaService, useValue: mockQuotaService },
        ],
      }).compile();
      const svc = module.get<CvService>(CvService);

      const file = makeFile();
      const result = await svc.uploadCv(file, 'user-id');

      expect(mockR2.upload).toHaveBeenCalledTimes(1);
      expect(mockPrisma.cvDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-id',
          name: 'cv',
          fileName: 'cv.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          parsedText: null,
          parseStatus: 'COMPLETED',
          isActive: true,
        }),
      });
      expect(mockPrisma.cvDocument.update).not.toHaveBeenCalled();
      expect(parseSpy).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: mockDoc.id,
        name: mockDoc.name,
        fileName: mockDoc.fileName,
        fileSize: mockDoc.fileSize,
        mimeType: mockDoc.mimeType,
        storageKey: mockDoc.storageKey,
        createdAt: mockDoc.createdAt,
        parseStatus: 'COMPLETED',
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
      expect(mockPrisma.cvDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: 'cv', fileName: 'cv.docx' }),
      });
    });

    it.each([
      ['Foo Bar.pdf', 'Foo Bar'],
      ['a.b.c.pdf', 'a.b.c'],
      ['resume', 'resume'],
      ['.pdf', 'Untitled CV'],
      ['   .pdf', 'Untitled CV'],
    ])(
      'derives the CV name from the file name (%s -> %s)',
      async (originalname, expectedName) => {
        await service.uploadCv(makeFile({ originalname }), 'user-id');

        expect(mockPrisma.cvDocument.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ name: expectedName }),
        });
      },
    );

    it('truncates the derived CV name to 100 characters', async () => {
      const longBase = 'x'.repeat(150);
      await service.uploadCv(
        makeFile({ originalname: `${longBase}.pdf` }),
        'user-id',
      );

      const [{ data }] = mockPrisma.cvDocument.create.mock.calls[0] as [
        { data: { name: string } },
      ];
      expect(data.name).toBe('x'.repeat(100));
    });

    it('does not split multi-code-unit characters when truncating', async () => {
      const emoji = '\u{1F600}';
      await service.uploadCv(
        makeFile({ originalname: `${emoji.repeat(120)}.pdf` }),
        'user-id',
      );

      const [{ data }] = mockPrisma.cvDocument.create.mock.calls[0] as [
        { data: { name: string } },
      ];
      expect(data.name).toBe(emoji.repeat(100));
    });

    it('storage key encodes the userId and uses the correct extension', async () => {
      const file = makeFile();
      await service.uploadCv(file, 'user-123');

      const [key] = mockR2.upload.mock.calls[0] as [string, ...unknown[]];
      expect(key).toMatch(/^uploads\/user-123\/.+\.pdf$/);
    });

    it('throws UnprocessableEntityException and cleans up when parsing fails', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CvService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: R2Service, useValue: mockR2 },
          {
            provide: CvParserService,
            useValue: {
              parse: jest.fn().mockRejectedValue(new Error('bad pdf')),
            },
          },
          { provide: QuotaService, useValue: mockQuotaService },
        ],
      }).compile();
      const svc = module.get<CvService>(CvService);

      const file = makeFile({
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'cv.docx',
      });
      await expect(svc.uploadCv(file, 'user-id')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockPrisma.cvDocument.delete).toHaveBeenCalledWith({
        where: { id: mockDoc.id },
      });
      expect(mockR2.delete).toHaveBeenCalledTimes(1);
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

    it('rejects with CV_LIMIT_EXCEEDED when active CV count is at the tier cap', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tier: 'FREE',
      });
      mockPrisma.cvDocument.count.mockResolvedValueOnce(1);
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockR2.upload).not.toHaveBeenCalled();
      expect(mockPrisma.cvDocument.create).not.toHaveBeenCalled();
    });

    it('allows upload when active CV count is under the tier cap', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tier: 'FREE',
      });
      mockPrisma.cvDocument.count.mockResolvedValueOnce(0);
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).resolves.toBeDefined();
      expect(mockPrisma.cvDocument.create).toHaveBeenCalled();
    });

    it('uses the BASIC tier cap (5) when the user has no FREE-tier limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce({
        tier: 'BASIC',
      });
      mockPrisma.cvDocument.count.mockResolvedValueOnce(4);
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).resolves.toBeDefined();
    });

    it('defaults to FREE tier limits when no subscription row exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);
      mockPrisma.cvDocument.count.mockResolvedValueOnce(1);
      const file = makeFile();

      await expect(service.uploadCv(file, 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUserCvs', () => {
    it('returns a list of CV documents for the given user ordered by createdAt desc', async () => {
      mockPrisma.cvDocument.findMany.mockResolvedValueOnce([mockDoc]);

      const result = await service.getUserCvs('user-id');

      expect(mockPrisma.cvDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          storageKey: true,
          createdAt: true,
          updatedAt: true,
          parsedText: true,
          parseStatus: true,
          extractionStatus: true,
          manuallyEdited: true,
        },
      });
      expect(result).toEqual([mockDoc]);
    });

    it('returns an empty array when user has no documents', async () => {
      mockPrisma.cvDocument.findMany.mockResolvedValueOnce([]);
      const result = await service.getUserCvs('user-id');
      expect(result).toEqual([]);
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a pre-signed URL for a document owned by the user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(mockDoc);
      mockR2.getPresignedUrl.mockResolvedValueOnce(
        'https://signed.url/file.pdf',
      );

      const result = await service.getDownloadUrl('doc-id', 'user-id');

      expect(mockR2.getPresignedUrl).toHaveBeenCalledWith(
        mockDoc.storageKey,
        900,
      );
      expect(result).toEqual({ url: 'https://signed.url/file.pdf' });
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.getDownloadUrl('missing-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockDoc,
        userId: 'other-user',
      });
      await expect(service.getDownloadUrl('doc-id', 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when storageKey is missing (builder-created CV)', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockDoc,
        storageKey: null,
      });
      await expect(service.getDownloadUrl('doc-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStructuredData', () => {
    const mockStructuredDoc = {
      ...mockDoc,
      extractionStatus: 'COMPLETED' as const,
      structuredData: { contact: { name: 'Jane' } },
    };

    it('returns structured data and the CV name for a completed extraction', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(mockStructuredDoc);

      const result = await service.getStructuredData('doc-id', 'user-id');

      expect(mockPrisma.cvDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        select: {
          userId: true,
          name: true,
          extractionStatus: true,
          structuredData: true,
        },
      });
      expect(result).toEqual({
        data: mockStructuredDoc.structuredData,
        name: mockStructuredDoc.name,
      });
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getStructuredData('missing-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockStructuredDoc,
        userId: 'other-user',
      });

      await expect(
        service.getStructuredData('doc-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when extractionStatus is not COMPLETED', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockStructuredDoc,
        extractionStatus: 'PENDING',
      });

      await expect(
        service.getStructuredData('doc-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when structuredData is null', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockStructuredDoc,
        structuredData: null,
      });

      await expect(
        service.getStructuredData('doc-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCv', () => {
    it('deletes the R2 object and DB record for a document owned by the user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(mockDoc);

      await service.deleteCv('doc-id', 'user-id');

      expect(mockR2.delete).toHaveBeenCalledWith(mockDoc.storageKey);
      expect(mockPrisma.cvDocument.delete).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
      });
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteCv('missing-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockDoc,
        userId: 'other-user',
      });
      await expect(service.deleteCv('doc-id', 'user-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('does not delete the DB record when R2 deletion fails', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(mockDoc);
      mockR2.delete.mockRejectedValueOnce(new Error('R2 error'));

      await expect(service.deleteCv('doc-id', 'user-id')).rejects.toThrow();
      expect(mockPrisma.cvDocument.delete).not.toHaveBeenCalled();
    });

    it('skips R2 deletion for a builder-created CV with no storageKey', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockDoc,
        storageKey: null,
      });

      await service.deleteCv('doc-id', 'user-id');

      expect(mockR2.delete).not.toHaveBeenCalled();
      expect(mockPrisma.cvDocument.delete).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
      });
    });
  });

  describe('createManualCv', () => {
    const manualDoc = {
      ...mockDoc,
      name: 'Untitled CV',
      fileName: null,
      fileSize: null,
      mimeType: null,
      storageKey: null,
      structuredData: mockStructuredData,
      extractionStatus: 'COMPLETED' as const,
      manuallyEdited: true,
    };

    it('consumes CV_BUILDER quota and creates a CvDocument with no file fields', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);
      mockPrisma.cvDocument.create.mockResolvedValueOnce(manualDoc);

      const result = await service.createManualCv(
        mockStructuredData,
        'user-id',
      );

      expect(mockQuotaService.checkAndConsume).toHaveBeenCalledWith(
        'user-id',
        'CV_BUILDER',
        'FREE',
        expect.any(Date),
        null,
        false,
      );
      expect(mockPrisma.cvDocument.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-id',
          name: 'Untitled CV',
          fileName: null,
          fileSize: null,
          mimeType: null,
          storageKey: null,
          parsedText: null,
          parseStatus: 'COMPLETED',
          structuredData: mockStructuredData,
          extractionStatus: 'COMPLETED',
          manuallyEdited: true,
          isActive: true,
        },
      });
      expect(result).toEqual(manualDoc);
    });

    it('stores the provided name and keeps it out of structuredData', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);
      mockPrisma.cvDocument.create.mockResolvedValueOnce({
        ...manualDoc,
        name: 'My CV',
      });

      const result = await service.createManualCv(
        { ...mockStructuredData, name: 'My CV' },
        'user-id',
      );

      const [{ data }] = mockPrisma.cvDocument.create.mock.calls[0] as [
        { data: { name: string; structuredData: Record<string, unknown> } },
      ];
      expect(data.name).toBe('My CV');
      expect(data.structuredData).toEqual(mockStructuredData);
      expect(data.structuredData).not.toHaveProperty('name');
      expect(result.name).toBe('My CV');
    });

    it('propagates ForbiddenException when quota is exceeded', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);
      mockQuotaService.checkAndConsume.mockRejectedValueOnce(
        new ForbiddenException({ code: 'QUOTA_EXCEEDED' }),
      );

      await expect(
        service.createManualCv(mockStructuredData, 'user-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.cvDocument.create).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException when the feature is not available on the tier', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);
      mockQuotaService.checkAndConsume.mockRejectedValueOnce(
        new ForbiddenException({ code: 'FEATURE_NOT_AVAILABLE' }),
      );

      await expect(
        service.createManualCv(mockStructuredData, 'user-id'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.cvDocument.create).not.toHaveBeenCalled();
    });
  });

  describe('renameCv', () => {
    it('renames a CV owned by the user and returns the updated document', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        userId: 'user-id',
      });
      const renamedDoc = { ...mockDoc, name: 'New name' };
      mockPrisma.cvDocument.update.mockResolvedValueOnce(renamedDoc);

      const result = await service.renameCv('doc-id', 'New name', 'user-id');

      expect(mockPrisma.cvDocument.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        select: { userId: true },
      });
      expect(mockPrisma.cvDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        data: { name: 'New name' },
      });
      expect(result).toEqual(renamedDoc);
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.renameCv('missing-id', 'New name', 'user-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cvDocument.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        userId: 'other-user',
      });

      await expect(
        service.renameCv('doc-id', 'New name', 'user-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cvDocument.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStructuredData', () => {
    it('overwrites structuredData and sets manuallyEdited to true for the owner', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(mockDoc);
      const updatedDoc = {
        ...mockDoc,
        structuredData: mockStructuredData,
        manuallyEdited: true,
      };
      mockPrisma.cvDocument.update.mockResolvedValueOnce(updatedDoc);

      const result = await service.updateStructuredData(
        'doc-id',
        mockStructuredData,
        'user-id',
      );

      expect(mockPrisma.cvDocument.update).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        data: {
          structuredData: mockStructuredData,
          manuallyEdited: true,
        },
      });
      expect(mockQuotaService.checkAndConsume).not.toHaveBeenCalled();
      expect(result).toEqual(updatedDoc);
    });

    it('throws NotFoundException when document does not exist', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateStructuredData(
          'missing-id',
          mockStructuredData,
          'user-id',
        ),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cvDocument.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when document belongs to another user', async () => {
      mockPrisma.cvDocument.findUnique.mockResolvedValueOnce({
        ...mockDoc,
        userId: 'other-user',
      });

      await expect(
        service.updateStructuredData('doc-id', mockStructuredData, 'user-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cvDocument.update).not.toHaveBeenCalled();
    });
  });
});
