import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QuotaModule } from '../quota/quota.module';
import { SupabaseClientProvider } from '../auth/supabase-client.provider';
import { SupabaseGuard } from '../auth/supabase.guard';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule, QuotaModule],
  controllers: [UsersController],
  providers: [UsersService, SupabaseClientProvider, SupabaseGuard],
  exports: [UsersService],
})
export class UsersModule {}
