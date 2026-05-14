import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { R2Service } from './r2.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-s3')>(
    '@aws-sdk/client-s3',
  );
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://r2.example.com',
      R2_ACCESS_KEY_ID: 'access-key',
      R2_SECRET_ACCESS_KEY: 'secret-key',
    };
    return values[key];
  }),
};

describe('R2Service', () => {
  let service: R2Service;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Service,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<R2Service>(R2Service);
  });

  describe('upload', () => {
    it('sends a PutObjectCommand with the correct parameters', async () => {
      mockSend.mockResolvedValueOnce({});
      const buffer = Buffer.from('file content');

      await service.upload('uploads/user/file.pdf', buffer, 'application/pdf');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as PutObjectCommand;
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'uploads/user/file.pdf',
        Body: buffer,
        ContentType: 'application/pdf',
        ContentLength: buffer.length,
      });
    });

    it('throws InternalServerErrorException when S3Client.send fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      await expect(
        service.upload('key', Buffer.from(''), 'application/pdf'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    it('sends a DeleteObjectCommand with the correct key', async () => {
      mockSend.mockResolvedValueOnce({});

      await service.delete('uploads/user/file.pdf');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0] as DeleteObjectCommand;
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'uploads/user/file.pdf',
      });
    });

    it('throws InternalServerErrorException when S3Client.send fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('S3 error'));

      await expect(service.delete('key')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
