import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type Stripe from 'stripe';
import { StripeService } from './stripe.service.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import { SupabaseGuard } from '../auth/supabase.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserModel } from '../../generated/prisma/models.js';

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout-session')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Checkout session for upgrading' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createCheckoutSession(
    @CurrentUser() user: UserModel,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<{ url: string }> {
    return this.stripeService.createCheckoutSession(
      user.id,
      user.email,
      dto.tier,
    );
  }

  @Post('portal-session')
  @UseGuards(SupabaseGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe Billing Portal session' })
  @ApiResponse({ status: 200, description: 'Billing portal session URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'No billing account found' })
  async createPortalSession(
    @CurrentUser() user: UserModel,
  ): Promise<{ url: string }> {
    return this.stripeService.createPortalSession(user.id);
  }

  @Post('webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Event acknowledged' })
  @ApiResponse({ status: 400, description: 'Invalid signature' })
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!request.rawBody) {
      throw new InternalServerErrorException(
        'Raw request body is not available; check rawBody configuration.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.verifyAndConstructEvent(
        request.rawBody,
        signature,
      );
    } catch (error) {
      this.logger.warn(`Stripe webhook signature verification failed: ${error}`);
      throw new BadRequestException('Invalid Stripe signature.');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.stripeService.handleCheckoutSessionCompleted(event);
        break;
      case 'customer.subscription.updated':
        await this.stripeService.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.stripeService.handleSubscriptionDeleted(event);
        break;
      case 'invoice.paid':
        await this.stripeService.handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await this.stripeService.handleInvoicePaymentFailed(event);
        break;
      default:
        break;
    }

    return { received: true };
  }
}
