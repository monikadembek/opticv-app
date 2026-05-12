/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = configService.get<number>('port', 3000);
  const env = configService.get<string>('nodeEnv');

  app.enableCors();
  await app.listen(port);
  Logger.log(
    `🚀 Environment: ${env} - App is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
