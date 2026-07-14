import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateDisplayNameDto } from './dto/update-display-name.dto';
import { SupabaseGuard } from '../auth/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserModel } from '../../generated/prisma/models.js';
import type { UsageStatus } from '@opticv/datatypes';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync user from Supabase webhook' })
  @ApiHeader({
    name: 'x-webhook-secret',
    required: true,
    description: 'Supabase webhook secret',
  })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        received: { type: 'boolean' },
      },
    },
    description: 'User synced successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid webhook secret' })
  async sync(
    @Headers('x-webhook-secret') webhookSecret: string | undefined,
    @Body() body: WebhookPayloadDto,
  ): Promise<{ received: boolean }> {
    const expected = this.configService.getOrThrow<string>(
      'supabase.webhookSecret',
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

    this.logger.log('New user created: ', upsertUser.id);

    return { received: true };
  }

  @Get('me')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: UserModel): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.supabaseId);
  }

  @Patch('me/display-name')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user display name' })
  @ApiResponse({
    status: 200,
    type: UserProfileDto,
    description: 'Updated user profile',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateDisplayName(
    @CurrentUser() user: UserModel,
    @Body() dto: UpdateDisplayNameDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateDisplayName(user.supabaseId, dto);
  }

  @Get('me/usage')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user usage/quota status' })
  @ApiResponse({ status: 200, description: 'Usage status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUsageStatus(
    @CurrentUser() user: UserModel,
  ): Promise<UsageStatus> {
    return this.usersService.getUsageStatus(user.supabaseId);
  }

  @Delete('me')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 500, description: 'Failed to delete account' })
  async deleteAccount(@CurrentUser() user: UserModel): Promise<void> {
    await this.usersService.deleteAccount(user.supabaseId);
  }
}
