import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvParserService } from './cv-parser.service';
import { R2Service } from './r2.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CvController],
  providers: [CvService, CvParserService, R2Service],
})
export class CvModule {}
