import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');

    this.client = new S3Client({
      endpoint: this.config.getOrThrow<string>('R2_PUBLIC_URL'),
      region: 'auto',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
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
      Logger.error(error);
      throw new InternalServerErrorException('File storage failed.');
    }
  }
}
