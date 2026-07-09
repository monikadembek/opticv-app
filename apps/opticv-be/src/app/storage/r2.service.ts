import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  private readonly logger = new Logger(R2Service.name);

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('r2.bucketName');

    this.client = new S3Client({
      endpoint: this.config.getOrThrow<string>('r2.publicUrl'),
      region: 'auto',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('r2.accessKeyId'),
        secretAccessKey: this.config.getOrThrow<string>('r2.secretAccessKey'),
      },
    });
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
        }),
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('File storage failed.');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('File deletion failed.');
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const stream = response.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('File download failed.');
    }
  }

  async getPresignedUrl(key: string, ttlSeconds: number): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(this.client, command, {
        expiresIn: ttlSeconds,
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'Failed to generate download URL.',
      );
    }
  }
}
