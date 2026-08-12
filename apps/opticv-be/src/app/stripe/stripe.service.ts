import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import type { SubscriptionStatus } from '@opticv/datatypes';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionService } from '../subscription/subscription.service.js';

const STRIPE_STATUS_TO_SUBSCRIPTION_STATUS: Record<
  string,
  SubscriptionStatus | undefined
> = {
  active: 'ACTIVE',
  canceled: 'CANCELED',
  // PAST_DUE - Stripe sets a subscription to past_due when a renewal payment fails but Stripe is still retrying (per your dunning/retry settings) before it either recovers or gets canceled. Used to show the user their payment failed and access may be at risk.
  past_due: 'PAST_DUE',
  // TRIALING — Stripe sets this during a free trial period, before the first charge happens. Used to reflect trial state (e.g., "your trial ends on X").
  trialing: 'TRIALING',
};

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly priceForTier: Record<'BASIC' | 'PRO', string>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {
    this.stripe = new Stripe(
      this.config.getOrThrow<string>('stripe.secretKey'),
      {
        apiVersion: '2026-07-29.dahlia',
      },
    );
    this.priceForTier = {
      BASIC: this.config.getOrThrow<string>('stripe.priceBasic'),
      PRO: this.config.getOrThrow<string>('stripe.pricePro'),
    };
  }

  private priceIdToTier(priceId: string): 'BASIC' | 'PRO' | null {
    const prices = this.priceForTier;
    if (priceId === prices.BASIC) return 'BASIC';
    if (priceId === prices.PRO) return 'PRO';
    return null;
  }

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, stripeCustomerId: customer.id },
      update: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    tier: 'BASIC' | 'PRO',
  ): Promise<{ url: string }> {
    const priceId = this.priceForTier[tier];
    const customerId = await this.getOrCreateCustomer(userId, email);
    const frontendUrl = this.config.getOrThrow<string>('frontendUrl');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      success_url: `${frontendUrl}/settings?billing=success`,
      cancel_url: `${frontendUrl}/settings?billing=canceled`,
    });

    if (!session.url) {
      throw new InternalServerErrorException(
        'Stripe did not return a checkout session URL.',
      );
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new ForbiddenException('No billing account found for this user.');
    }

    const frontendUrl = this.config.getOrThrow<string>('frontendUrl');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/settings`,
    });

    return { url: session.url };
  }

  verifyAndConstructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.getOrThrow<string>(
      'stripe.webhookSecret',
    );
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (!userId) {
      this.logger.warn(
        `checkout.session.completed missing client_reference_id (session ${session.id})`,
      );
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(
        `checkout.session.completed: no user found for id ${userId}`,
      );
      return;
    }

    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!stripeSubscriptionId) {
      this.logger.warn(
        `checkout.session.completed missing subscription id (session ${session.id})`,
      );
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const tier = priceId ? this.priceIdToTier(priceId) : null;

    if (!tier) {
      this.logger.error(
        `checkout.session.completed: unknown price id ${priceId} (subscription ${stripeSubscriptionId})`,
      );
    }

    const item = subscription.items.data[0];
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        ...(tier ? { tier } : {}),
        status: 'ACTIVE',
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId ?? null,
        currentPeriodStart: item
          ? new Date(item.current_period_start * 1000)
          : null,
        currentPeriodEnd: item
          ? new Date(item.current_period_end * 1000)
          : null,
      },
      update: {
        ...(tier ? { tier } : {}),
        status: 'ACTIVE',
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId ?? null,
        currentPeriodStart: item
          ? new Date(item.current_period_start * 1000)
          : null,
        currentPeriodEnd: item
          ? new Date(item.current_period_end * 1000)
          : null,
      },
    });
  }

  async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!stripeCustomerId) {
      this.logger.warn(
        `customer.subscription.updated: missing customer id (subscription ${subscription.id})`,
      );
      return;
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId },
    });

    if (!existing) {
      this.logger.warn(
        `customer.subscription.updated: no subscription row found for customer ${stripeCustomerId}`,
      );
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const tier = priceId ? this.priceIdToTier(priceId) : null;

    if (priceId && !tier) {
      this.logger.error(
        `customer.subscription.updated: unknown price id ${priceId} (subscription ${subscription.id})`,
      );
    }

    const status = STRIPE_STATUS_TO_SUBSCRIPTION_STATUS[subscription.status];
    if (!status) {
      this.logger.error(
        `customer.subscription.updated: unmapped Stripe status "${subscription.status}" (subscription ${subscription.id})`,
      );
    }

    const item = subscription.items.data[0];

    await this.prisma.subscription.update({
      where: { stripeCustomerId },
      data: {
        ...(tier ? { tier } : {}),
        ...(status ? { status } : {}),
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId ?? existing.stripePriceId,
        currentPeriodStart: item
          ? new Date(item.current_period_start * 1000)
          : existing.currentPeriodStart,
        currentPeriodEnd: item
          ? new Date(item.current_period_end * 1000)
          : existing.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionDetails =
      invoice.parent?.type === 'subscription_details'
        ? invoice.parent.subscription_details
        : null;
    const stripeSubscriptionId =
      typeof subscriptionDetails?.subscription === 'string'
        ? subscriptionDetails.subscription
        : subscriptionDetails?.subscription?.id;

    if (!stripeSubscriptionId) {
      this.logger.warn(
        `invoice.paid missing subscription id (invoice ${invoice.id})`,
      );
      return;
    }

    const stripeCustomerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId },
    });

    if (!existing) {
      this.logger.warn(
        `invoice.paid: no subscription row found for customer ${stripeCustomerId}`,
      );
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price.id;
    const tier = priceId ? this.priceIdToTier(priceId) : null;

    if (priceId && !tier) {
      this.logger.error(
        `invoice.paid: unknown price id ${priceId} (subscription ${stripeSubscriptionId})`,
      );
    }

    const item = subscription.items.data[0];

    await this.prisma.subscription.update({
      where: { stripeCustomerId },
      data: {
        ...(tier ? { tier } : {}),
        status: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId ?? existing.stripePriceId,
        currentPeriodStart: item
          ? new Date(item.current_period_start * 1000)
          : existing.currentPeriodStart,
        currentPeriodEnd: item
          ? new Date(item.current_period_end * 1000)
          : existing.currentPeriodEnd,
      },
    });
  }

  async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeCustomerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId },
    });

    if (!existing) {
      this.logger.warn(
        `invoice.payment_failed: no subscription row found for customer ${stripeCustomerId}`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { stripeCustomerId },
      data: { status: 'PAST_DUE' },
    });
  }

  async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!stripeCustomerId) {
      this.logger.warn(
        `customer.subscription.deleted: missing customer id (subscription ${subscription.id})`,
      );
      return;
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId },
    });

    if (!existing) {
      this.logger.warn(
        `customer.subscription.deleted: no subscription row found for customer ${stripeCustomerId}`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { stripeCustomerId },
      data: {
        tier: 'FREE',
        status: 'CANCELED',
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
        ...this.subscriptionService.freeTierCycleFrom(),
      },
    });
  }
}
