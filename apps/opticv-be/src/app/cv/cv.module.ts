import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvParserService } from './services/cv-parser.service';
import { CvExtractionService } from './services/cv-extraction.service';
import { R2Service } from './services/r2.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuthModule, PrismaModule, ConfigModule, AiModule],
  controllers: [CvController],
  providers: [CvService, CvParserService, R2Service, CvExtractionService],
})
export class CvModule {}
