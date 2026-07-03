/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */
import './instrument';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ThrottlerExceptionFilter } from './app/throttler/throttler-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = 'api';
  const port = configService.get<number>('port', 3000);
  const env = configService.get<string>('nodeEnv');

  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OptiCV API')
      .setDescription('REST API for the OptiCV application')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }

  app.use(helmet());
  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ThrottlerExceptionFilter());
  app.enableCors({ origin: configService.get<string>('frontendUrl') });
  await app.listen(port);
  Logger.log(
    `🚀 Environment: ${env} - App is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
