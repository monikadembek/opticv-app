import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvParserService } from './cv-parser.service';
import { CvExtractionService } from './cv-extraction.service';
import { R2Service } from './r2.service';
import { OpenAiExtractionService } from './ai/openai-extraction.service';
import { AI_EXTRACTION_PROVIDER } from './ai/ai-extraction.token';

@Module({
  imports: [AuthModule, PrismaModule, ConfigModule],
  controllers: [CvController],
  providers: [
    CvService,
    CvParserService,
    R2Service,
    CvExtractionService,
    {
      provide: AI_EXTRACTION_PROVIDER,
      useClass: OpenAiExtractionService,
    },
  ],
})
export class CvModule {}
