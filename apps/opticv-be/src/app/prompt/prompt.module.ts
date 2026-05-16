import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PromptService } from './prompt.service.js';

@Module({
  imports: [PrismaModule],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
