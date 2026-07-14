import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';
import { QuotaService } from '../quota/quota.service';
import { UserModel } from '../../generated/prisma/models.js';
import type { SubscriptionTier, UsageStatus, UserProfile } from '@opticv/datatypes';
import { TIER_LIMITS } from '@opticv/datatypes';
import { UpdateDisplayNameDto } from './dto/update-display-name.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
    private readonly quotaService: QuotaService,
  ) {}

  async upsertUser(data: {
    supabaseId: string;
    email: string;
  }): Promise<UserModel> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: data.email },
        create: { supabaseId: data.supabaseId, email: data.email },
        update: { supabaseId: data.supabaseId },
      });

      await tx.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tier: 'FREE', status: 'ACTIVE' },
        update: {},
      });

      return user;
    });
  }

  async getProfile(supabaseId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      subscription: user.subscription
        ? { tier: user.subscription.tier, status: user.subscription.status }
        : null,
    };
  }

  async updateDisplayName(
    supabaseId: string,
    dto: UpdateDisplayNameDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { displayName: dto.displayName },
      include: { subscription: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      subscription: updatedUser.subscription
        ? {
            tier: updatedUser.subscription.tier,
            status: updatedUser.subscription.status,
          }
        : null,
    };
  }

  async getUsageStatus(supabaseId: string): Promise<UsageStatus> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: { subscription: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const tier = (user.subscription?.tier ?? 'FREE') as SubscriptionTier;
    const quotas = await this.quotaService.getQuotaStatus(user.id, tier);
    const maxStoredCvs = TIER_LIMITS[tier].maxStoredCvs;
    const storedCvsUsed = await this.prisma.cvDocument.count({
      where: { userId: user.id, isActive: true },
    });

    return {
      quotas,
      storedCvs: { used: storedCvsUsed, limit: maxStoredCvs },
    };
  }

  async deleteAccount(supabaseId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const cvDocuments = await this.prisma.cvDocument.findMany({
      where: { userId: user.id },
      select: { storageKey: true },
    });

    for (const doc of cvDocuments) {
      try {
        await this.r2.delete(doc.storageKey);
      } catch (error) {
        this.logger.error(
          `Failed to delete R2 object "${doc.storageKey}" for user ${user.id}: ${error}`,
        );
      }
    }

    await this.prisma.user.delete({ where: { id: user.id } });

    const supabaseUrl = this.config.getOrThrow<string>('supabase.url');
    const serviceRoleKey = this.config.getOrThrow<string>(
      'supabase.serviceRoleKey',
    );
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseId);
    if (error) {
      this.logger.error(
        `Failed to delete Supabase auth user ${supabaseId}: ${error.message}`,
      );
      throw new InternalServerErrorException('Failed to delete account.');
    }
  }
}
