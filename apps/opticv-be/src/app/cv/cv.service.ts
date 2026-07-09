import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { CvParserService } from './services/cv-parser.service';
import { CvDocumentListItem, CvStructuredData, UploadCvResponse } from '@opticv/datatypes';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};

@Injectable()
export class CvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly cvParser: CvParserService,
  ) {}

  private readonly logger = new Logger(CvService.name);

  async uploadCv(
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<UploadCvResponse> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }

    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and DOCX files are accepted.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File must be smaller than 5 MB.');
    }

    const ext = MIME_TO_EXT[file.mimetype];
    const storageKey = `uploads/${userId}/${crypto.randomUUID()}.${ext}`;

    await this.r2.upload(storageKey, file.buffer, file.mimetype);

    const isPdf = file.mimetype === 'application/pdf';

    let docId: string | undefined;
    try {
      if (isPdf) {
        const doc = await this.prisma.cvDocument.create({
          data: {
            userId,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            storageKey,
            parsedText: null,
            parseStatus: 'COMPLETED',
            isActive: true,
          },
        });
        docId = doc.id;

        return {
          id: doc.id,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          storageKey: doc.storageKey,
          createdAt: doc.createdAt,
          parseStatus: 'COMPLETED',
        };
      }

      const doc = await this.prisma.cvDocument.create({
        data: {
          userId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageKey,
          parsedText: null,
          parseStatus: 'PENDING',
          isActive: true,
        },
      });
      docId = doc.id;

      let parsedText: string;
      try {
        parsedText = await this.cvParser.parse(file.buffer, file.mimetype);
      } catch (parseError) {
        this.logger.error(
          `Failed to parse CV document ${doc.id}: ${parseError}`,
        );
        await this.prisma.cvDocument
          .delete({ where: { id: doc.id } })
          .catch((e) =>
            this.logger.error(
              `Failed to clean up DB record ${doc.id} after parse failure: ${e}`,
            ),
          );
        await this.r2
          .delete(storageKey)
          .catch((e) =>
            this.logger.error(
              `Failed to clean up R2 object after parse failure: ${e}`,
            ),
          );
        throw new UnprocessableEntityException(
          'Could not parse the uploaded file. Please ensure it is a valid, non-protected PDF or DOCX.',
        );
      }

      await this.prisma.cvDocument.update({
        where: { id: doc.id },
        data: { parsedText, parseStatus: 'COMPLETED' },
      });

      return {
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        storageKey: doc.storageKey,
        createdAt: doc.createdAt,
        parseStatus: 'COMPLETED',
      };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.error(error);
      if (!docId) {
        await this.r2
          .delete(storageKey)
          .catch((deleteError) =>
            this.logger.error(
              `Failed to clean up R2 object after DB error: ${deleteError}`,
            ),
          );
      }
      throw new InternalServerErrorException('Failed to save file record.');
    }
  }

  async getUserCvs(userId: string): Promise<CvDocumentListItem[]> {
    return this.prisma.cvDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        parsedText: true,
        parseStatus: true,
      },
    });
  }

  async getDownloadUrl(id: string, userId: string): Promise<{ url: string }> {
    const doc = await this.prisma.cvDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('CV document not found.');
    if (doc.userId !== userId) throw new ForbiddenException();
    if (!doc.storageKey) {
      throw new InternalServerErrorException(
        'Storage key is missing for this document.',
      );
    }
    const url = await this.r2.getPresignedUrl(doc.storageKey, 900);
    return { url };
  }

  async getStructuredData(cvId: string, userId: string): Promise<{ data: CvStructuredData }> {
    const doc = await this.prisma.cvDocument.findUnique({
      where: { id: cvId },
      select: { userId: true, extractionStatus: true, structuredData: true },
    });

    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('CV document not found.');
    }

    if (doc.extractionStatus !== 'COMPLETED' || doc.structuredData === null) {
      throw new NotFoundException('Structured data not available.');
    }

    return { data: doc.structuredData as unknown as CvStructuredData };
  }

  async deleteCv(id: string, userId: string): Promise<void> {
    const doc = await this.prisma.cvDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('CV document not found.');
    if (doc.userId !== userId) throw new ForbiddenException();
    await this.r2.delete(doc.storageKey);
    await this.prisma.cvDocument.delete({ where: { id } });
  }
}
