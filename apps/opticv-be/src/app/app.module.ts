import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { configuration } from '../../config/configuration';
import { validationSchema } from '../../config/validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { JobApplicationModule } from './job-application/job-application.module';
import { OptimizationModule } from './optimization/optimization.module';
import { ApiThrottlerGuard } from './throttler/api-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/apps/opticv-be/config/env/${process.env.NODE_ENV}.env`,
      load: [configuration],
      validationSchema,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new ThrottlerStorageRedisService({
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        }),
        throttlers: [
          {
            name: 'api-ip',
            ttl: config.get<number>('throttler.apiIpTtl')!,
            limit: config.get<number>('throttler.apiIpLimit')!,
          },
          {
            name: 'api-user',
            ttl: config.get<number>('throttler.apiUserTtl')!,
            limit: config.get<number>('throttler.apiUserLimit')!,
          },
          {
            name: 'ai-ip',
            ttl: config.get<number>('throttler.aiIpTtl')!,
            limit: config.get<number>('throttler.aiIpLimit')!,
          },
          {
            name: 'ai-user',
            ttl: config.get<number>('throttler.aiUserTtl')!,
            limit: config.get<number>('throttler.aiUserLimit')!,
          },
        ],
      }),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CvModule,
    JobApplicationModule,
    OptimizationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ApiThrottlerGuard },
  ],
})
export class AppModule {}
