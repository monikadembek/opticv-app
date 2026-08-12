import { ForbiddenException, Injectable } from '@nestjs/common';
import type { LimitedFeature, QuotaStatus, SubscriptionTier } from '@opticv/datatypes';
import { TIER_LIMITS } from '@opticv/datatypes';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndConsume(
    userId: string,
    feature: LimitedFeature,
    tier: SubscriptionTier,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const limit = TIER_LIMITS[tier].features[feature];
    const resetsAt = periodEnd.toISOString();

    if (limit === 0) {
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        feature,
        limit,
        resetsAt,
      });
    }

    const runAttempt = () =>
      this.prisma.$transaction(async (tx) => {
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

    let consumed: boolean;
    try {
      consumed = await runAttempt();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        consumed = await runAttempt();
      } else {
        throw error;
      }
    }

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
    periodStart: Date,
    periodEnd: Date,
  ): Promise<QuotaStatus[]> {
    const resetsAt = periodEnd.toISOString();

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
