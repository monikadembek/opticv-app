import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAiService } from './services/openai.service';
import { PromptService } from './services/prompt.service';

@Module({
  imports: [AuthModule, PrismaModule, ConfigModule],
  controllers: [],
  providers: [OpenAiService, PromptService],
  exports: [OpenAiService, PromptService],
})
export class AiModule {}
