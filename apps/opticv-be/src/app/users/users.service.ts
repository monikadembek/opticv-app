import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserModel } from '../../generated/prisma/models.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(data: {
    supabaseId: string;
    email: string;
  }): Promise<UserModel> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { supabaseId: data.supabaseId },
        create: { supabaseId: data.supabaseId, email: data.email },
        update: {},
      });

      await tx.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, tier: 'FREE', status: 'ACTIVE' },
        update: {},
      });

      return user;
    });
  }
}
