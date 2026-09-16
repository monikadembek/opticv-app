import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PromptType } from '../../../generated/prisma/enums.js';

export interface UsageLogParams {
  userId: string;
  promptType: PromptType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: Decimal;
}

@Injectable()
export class UsageLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: UsageLogParams): Promise<void> {
    await this.prisma.usageLog.create({
      data: {
        userId: params.userId,
        promptType: params.promptType,
        modelId: params.modelId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd: params.costUsd,
      },
    });
  }
}
