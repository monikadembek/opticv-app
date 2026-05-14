import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { UploadCvResponse } from '@opticv/datatypes';
import type { UserModel } from '../../generated/prisma/models.js';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockUploadResponse: UploadCvResponse = {
  id: 'doc-id',
  fileName: 'cv.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  storageKey: 'uploads/user-id/uuid.pdf',
  createdAt: new Date('2024-01-01'),
};

const mockCvService = {
  uploadCv: jest.fn().mockResolvedValue(mockUploadResponse),
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
      providers: [{ provide: CvService, useValue: mockCvService }],
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
});
