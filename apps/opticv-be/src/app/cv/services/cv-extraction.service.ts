import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CvStructuredData } from '@opticv/datatypes';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiService } from '../../ai/services/openai.service';
import { R2Service } from '../../storage/r2.service';

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly r2: R2Service,
  ) {}

  async extractStructuredData(
    cvId: string,
    userId: string,
  ): Promise<CvStructuredData> {
    const doc = await this.prisma.cvDocument.findUnique({
      where: { id: cvId },
    });

    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('CV document not found.');
    }

    if (doc.manuallyEdited) {
      throw new ForbiddenException({ code: 'MANUAL_EDIT_PROTECTED' });
    }

    if (doc.extractionStatus === 'COMPLETED' && doc.structuredData !== null) {
      this.logger.log(
        `Cache hit for CV ${cvId} — returning stored structured data`,
      );
      return doc.structuredData as unknown as CvStructuredData;
    }

    const isPdf = doc.mimeType === 'application/pdf';

    if (!isPdf && (!doc.parsedText || doc.parsedText.trim() === '')) {
      throw new BadRequestException(
        'CV text not available for extraction. Please re-upload the file.',
      );
    }

    if (!doc.storageKey || !doc.fileName) {
      throw new BadRequestException(
        'CV file not available for extraction. Please re-upload the file.',
      );
    }

    if (doc.extractionStatus !== 'PENDING') {
      await this.prisma.cvDocument.update({
        where: { id: cvId },
        data: { extractionStatus: 'PENDING' },
      });
    }

    try {
      const result = isPdf
        ? await this.openAiService.extractCvDataFromFile(
            await this.r2.download(doc.storageKey),
            doc.fileName,
          )
        : await this.openAiService.extractCvData(doc.parsedText as string);
      await this.prisma.cvDocument.update({
        where: { id: cvId },
        data: { structuredData: result, extractionStatus: 'COMPLETED' },
      });
      this.logger.log(`Extraction completed for CV ${cvId}`);
      return result;
    } catch (error) {
      this.logger.error(`Extraction failed for CV ${cvId}: ${error}`);
      await this.prisma.cvDocument.update({
        where: { id: cvId },
        data: { extractionStatus: 'FAILED' },
      });
      throw new BadGatewayException(
        'AI extraction failed. Please try again later.',
      );
    }
  }
}
