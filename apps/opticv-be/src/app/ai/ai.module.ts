import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAiService } from './services/openai.service';
import { PromptService } from './services/prompt.service';
import { CostCalculatorService } from './services/cost-calculator.service';
import { UsageLogService } from './services/usage-log.service';

@Module({
  imports: [AuthModule, PrismaModule, ConfigModule],
  controllers: [],
  providers: [OpenAiService, PromptService, CostCalculatorService, UsageLogService],
  exports: [OpenAiService, PromptService, CostCalculatorService, UsageLogService],
})
export class AiModule {}
