import { ForbiddenException, Injectable } from '@nestjs/common';
import type { LimitedFeature, QuotaStatus, SubscriptionTier } from '@opticv/datatypes';
import { TIER_LIMITS } from '@opticv/datatypes';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  resolvePeriodStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private resolveNextPeriodStart(periodStart: Date): Date {
    return new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1),
    );
  }

  async checkAndConsume(
    userId: string,
    feature: LimitedFeature,
    tier: SubscriptionTier,
  ): Promise<void> {
    const limit = TIER_LIMITS[tier].features[feature];
    const periodStart = this.resolvePeriodStart();
    const resetsAt = this.resolveNextPeriodStart(periodStart).toISOString();

    if (limit === 0) {
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        limit,
        resetsAt,
      });
    }

    const consumed = await this.prisma.$transaction(async (tx) => {
      const row = await tx.usageQuota.upsert({
        where: { userId_feature_periodStart: { userId, feature, periodStart } },
        create: { userId, feature, periodStart, count: 0 },
        update: {},
      });

      const result = await tx.usageQuota.updateMany({
        where: { id: row.id, count: { lt: limit } },
        data: { count: { increment: 1 } },
      });

      return result.count > 0;
    });

    if (!consumed) {
      throw new ForbiddenException({
        code: 'QUOTA_EXCEEDED',
        feature,
        limit,
        resetsAt,
      });
    }
  }

  async getQuotaStatus(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<QuotaStatus[]> {
    const periodStart = this.resolvePeriodStart();
    const resetsAt = this.resolveNextPeriodStart(periodStart).toISOString();

    const rows = await this.prisma.usageQuota.findMany({
      where: { userId, periodStart },
    });
    const usedByFeature = new Map(rows.map((row) => [row.feature, row.count]));

    return (Object.keys(TIER_LIMITS[tier].features) as LimitedFeature[]).map(
      (feature) => {
        const limit = TIER_LIMITS[tier].features[feature];
        const used = usedByFeature.get(feature) ?? 0;
        return {
          feature,
          used,
          limit,
          remaining: Math.max(0, limit - used),
          resetsAt,
        };
      },
    );
  }
}
