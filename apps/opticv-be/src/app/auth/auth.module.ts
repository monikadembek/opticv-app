import { forwardRef, Module } from '@nestjs/common';
import { SupabaseClientProvider } from './supabase-client.provider';
import { SupabaseGuard } from './supabase.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [SupabaseClientProvider, SupabaseGuard],
  exports: [
    SupabaseGuard,
    SupabaseClientProvider,
    forwardRef(() => UsersModule),
  ],
})
export class AuthModule {}
