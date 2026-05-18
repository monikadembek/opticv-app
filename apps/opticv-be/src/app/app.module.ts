import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { configuration } from '../../config/configuration';
import { validationSchema } from '../../config/validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { JobApplicationModule } from './job-application/job-application.module';
import { OptimizationModule } from './optimization/optimization.module';

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
    PrismaModule,
    UsersModule,
    AuthModule,
    CvModule,
    JobApplicationModule,
    OptimizationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
