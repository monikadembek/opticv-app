import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QuotaModule } from '../quota/quota.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvParserService } from './services/cv-parser.service';
import { CvExtractionService } from './services/cv-extraction.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    ConfigModule,
    AiModule,
    StorageModule,
    QuotaModule,
  ],
  controllers: [CvController],
  providers: [CvService, CvParserService, CvExtractionService],
})
export class CvModule {}
