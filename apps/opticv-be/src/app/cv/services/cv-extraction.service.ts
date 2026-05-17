import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CvStructuredData } from '@opticv/datatypes';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiService } from '../../ai/services/openai.service';

@Injectable()
export class CvExtractionService {
  private readonly logger = new Logger(CvExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    readonly openAiService: OpenAiService,
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

    if (doc.extractionStatus === 'COMPLETED' && doc.structuredData !== null) {
      this.logger.log(
        `Cache hit for CV ${cvId} — returning stored structured data`,
      );
      return doc.structuredData as unknown as CvStructuredData;
    }

    if (!doc.parsedText || doc.parsedText.trim() === '') {
      throw new BadRequestException(
        'CV text not available for extraction. Please re-upload the file.',
      );
    }

    if (doc.extractionStatus !== 'PENDING') {
      await this.prisma.cvDocument.update({
        where: { id: cvId },
        data: { extractionStatus: 'PENDING' },
      });
    }

    try {
      const result = await this.openAiService.extractCvData(doc.parsedText);
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
