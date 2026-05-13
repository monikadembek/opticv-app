import { Module } from '@nestjs/common';
import { SupabaseClientProvider } from './supabase-client.provider';
import { SupabaseGuard } from './supabase.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [SupabaseClientProvider, SupabaseGuard],
  exports: [SupabaseGuard],
})
export class AuthModule {}
