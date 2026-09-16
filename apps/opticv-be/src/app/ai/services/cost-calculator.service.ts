import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';

interface ModelPricing {
  inputPerMToken: number;
  outputPerMToken: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPerMToken: 0.15, outputPerMToken: 0.6 },
  'gpt-4o': { inputPerMToken: 2.5, outputPerMToken: 10 },
  'gpt-5-mini': { inputPerMToken: 0.25, outputPerMToken: 2 },
  'gpt-5.1': { inputPerMToken: 1.25, outputPerMToken: 10 },
};

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);

  calculate(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ): Decimal {
    const pricing = PRICING[modelId];

    if (!pricing) {
      this.logger.warn(
        `No pricing found for model "${modelId}" — cost defaulting to 0`,
      );
      return new Decimal(0);
    }

    const cost =
      (inputTokens / 1_000_000) * pricing.inputPerMToken +
      (outputTokens / 1_000_000) * pricing.outputPerMToken;

    return new Decimal(cost.toFixed(6));
  }
}
