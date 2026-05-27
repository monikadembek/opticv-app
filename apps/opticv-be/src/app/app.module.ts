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
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new ThrottlerStorageRedisService({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        }),
        throttlers: [
          {
            name: 'api-ip',
            ttl: config.get<number>('throttler.apiIpTtl') ?? 900,
            limit: config.get<number>('throttler.apiIpLimit') ?? 300,
          },
          {
            name: 'api-user',
            ttl: config.get<number>('throttler.apiUserTtl') ?? 900,
            limit: config.get<number>('throttler.apiUserLimit') ?? 100,
          },
          {
            name: 'ai-ip',
            ttl: config.get<number>('throttler.aiIpTtl') ?? 3600,
            limit: config.get<number>('throttler.aiIpLimit') ?? 50,
          },
          {
            name: 'ai-user',
            ttl: config.get<number>('throttler.aiUserTtl') ?? 3600,
            limit: config.get<number>('throttler.aiUserLimit') ?? 10,
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
