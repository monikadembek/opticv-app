import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QuotaService } from './quota.service.js';

@Module({
  imports: [PrismaModule],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}
