import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { UsersService } from './users.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async sync(
    @Headers('x-webhook-secret') webhookSecret: string | undefined,
    @Body() body: WebhookPayloadDto,
  ): Promise<{ received: boolean }> {
    const expected = this.configService.getOrThrow<string>(
      'SUPABASE_WEBHOOK_SECRET',
    );

    const isValid =
      webhookSecret !== undefined &&
      webhookSecret.length === expected.length &&
      timingSafeEqual(
        Buffer.from(webhookSecret, 'utf8'),
        Buffer.from(expected, 'utf8'),
      );

    if (!isValid) {
      throw new UnauthorizedException();
    }

    const upsertUser = await this.usersService.upsertUser({
      supabaseId: body.record.id,
      email: body.record.email,
    });

    Logger.log('New user created: ', upsertUser.email);

    return { received: true };
  }
}
