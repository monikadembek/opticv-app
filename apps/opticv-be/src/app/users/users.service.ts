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
import { UserModel } from '../../generated/prisma/models.js';
import type { UserProfile } from '@opticv/datatypes';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
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
