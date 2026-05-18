import Decimal from 'decimal.js';
import { CostCalculatorService } from './cost-calculator.service.js';

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new CostCalculatorService();
    warnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined);
  });

  it('calculates cost for a known model with normal token counts', () => {
    const result = service.calculate('gpt-4o-mini', 1_000_000, 1_000_000);
    expect(result).toEqual(new Decimal('0.750000'));
  });

  it('returns zero cost for zero tokens', () => {
    const result = service.calculate('gpt-4o-mini', 0, 0);
    expect(result).toEqual(new Decimal('0.000000'));
  });

  it('returns zero and warns for an unknown model', () => {
    const result = service.calculate('unknown-model', 500_000, 500_000);
    expect(result).toEqual(new Decimal(0));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown-model'),
    );
  });

  it('calculates correct fractional cost', () => {
    // 100k input tokens: 0.15 / 10 = 0.015
    // 200k output tokens: 0.60 / 5  = 0.120
    // total = 0.135
    const result = service.calculate('gpt-4o-mini', 100_000, 200_000);
    expect(result).toEqual(new Decimal('0.135000'));
  });
});
