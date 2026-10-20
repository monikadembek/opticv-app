import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionService } from '../subscription/subscription.service.js';

const FREE_TIER_CYCLE = {
  currentPeriodStart: new Date('2026-08-12T00:00:00.000Z'),
  currentPeriodEnd: null,
};

const mockSubscriptionService = {
  freeTierCycleFrom: jest.fn().mockReturnValue(FREE_TIER_CYCLE),
};

const mockPrisma = {
  subscription: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockStripeClient = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
  subscriptions: { retrieve: jest.fn(), list: jest.fn(), cancel: jest.fn() },
};

jest.mock('stripe', () => {
  const { errors } = jest.requireActual('stripe');
  return Object.assign(
    jest.fn().mockImplementation(() => mockStripeClient),
    { errors },
  );
});

const { errors: stripeErrors } = jest.requireActual('stripe');

function asyncIterableOf<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

function failingAsyncIterable(error: unknown): AsyncIterable<never> {
  return {
    // eslint-disable-next-line require-yield
    async *[Symbol.asyncIterator]() {
      throw error;
    },
  };
}

const CONFIG_VALUES: Record<string, string> = {
  'stripe.secretKey': 'sk_test_123',
  'stripe.webhookSecret': 'whsec_123',
  'stripe.priceBasic': 'price_basic',
  'stripe.pricePro': 'price_pro',
  frontendUrl: 'http://localhost:4200',
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
};

describe('StripeService', () => {
  let service: StripeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockImplementation(
      (key: string) => CONFIG_VALUES[key],
    );
    mockSubscriptionService.freeTierCycleFrom.mockReturnValue(FREE_TIER_CYCLE);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get(StripeService);
  });

  describe('getOrCreateCustomer', () => {
    it('reuses an existing stripeCustomerId', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });

      const result = await service.getOrCreateCustomer('user-1', 'a@b.com');

      expect(result).toBe('cus_existing');
      expect(mockStripeClient.customers.create).not.toHaveBeenCalled();
    });

    it('creates and persists a new customer when absent', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockStripeClient.customers.create.mockResolvedValue({ id: 'cus_new' });

      const result = await service.getOrCreateCustomer('user-1', 'a@b.com');

      expect(result).toBe('cus_new');
      expect(mockStripeClient.customers.create).toHaveBeenCalledWith({
        email: 'a@b.com',
        metadata: { userId: 'user-1' },
      });
      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', stripeCustomerId: 'cus_new' },
        update: { stripeCustomerId: 'cus_new' },
      });
    });
  });

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });
    });

    it('builds a session with the correct price id per tier', async () => {
      mockStripeClient.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_1',
      });

      const result = await service.createCheckoutSession(
        'user-1',
        'a@b.com',
        'BASIC',
      );

      expect(result).toEqual({ url: 'https://checkout.stripe.com/session_1' });
      expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer: 'cus_existing',
          line_items: [{ price: 'price_basic', quantity: 1 }],
          client_reference_id: 'user-1',
          consent_collection: { terms_of_service: 'required' },
          custom_text: {
            terms_of_service_acceptance: {
              message: expect.stringMatching(
                /\/terms-of-use\).*\/privacy-policy\)/,
              ),
            },
          },
        }),
      );
    });

    it('throws when Stripe returns a null session url', async () => {
      mockStripeClient.checkout.sessions.create.mockResolvedValue({
        url: null,
      });

      await expect(
        service.createCheckoutSession('user-1', 'a@b.com', 'PRO'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createPortalSession', () => {
    it('throws ForbiddenException when stripeCustomerId is null', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: null,
      });

      await expect(service.createPortalSession('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns { url } otherwise', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });
      mockStripeClient.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal_1',
      });

      const result = await service.createPortalSession('user-1');

      expect(result).toEqual({ url: 'https://billing.stripe.com/portal_1' });
    });
  });

  describe('verifyAndConstructEvent', () => {
    it('propagates signature verification failure', () => {
      mockStripeClient.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('signature mismatch');
      });

      expect(() =>
        service.verifyAndConstructEvent(Buffer.from('body'), 'sig'),
      ).toThrow('signature mismatch');
    });
  });

  describe('handleCheckoutSessionCompleted', () => {
    it('no-ops with a warning when client_reference_id does not resolve to a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await service.handleCheckoutSessionCompleted({
        data: {
          object: {
            id: 'cs_1',
            client_reference_id: 'missing-user',
            subscription: 'sub_1',
          },
        },
      } as never);

      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('upserts Subscription with tier/status/Stripe ids/period dates on match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockStripeClient.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        customer: 'cus_1',
        items: {
          data: [
            {
              price: { id: 'price_basic' },
              current_period_start: 1700000000,
              current_period_end: 1702592000,
            },
          ],
        },
      });

      await service.handleCheckoutSessionCompleted({
        data: {
          object: {
            id: 'cs_1',
            client_reference_id: 'user-1',
            subscription: 'sub_1',
          },
        },
      } as never);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: expect.objectContaining({
            tier: 'BASIC',
            status: 'ACTIVE',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_1',
            stripePriceId: 'price_basic',
          }),
        }),
      );
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('resets to tier FREE, status CANCELED, clears Stripe ids', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });

      await service.handleSubscriptionDeleted({
        data: {
          object: { customer: 'cus_1' },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: {
          tier: 'FREE',
          status: 'CANCELED',
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
          ...FREE_TIER_CYCLE,
        },
      });
    });

    it('no-ops with a warning when no subscription row matches the customer', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleSubscriptionDeleted({
        data: { object: { customer: 'cus_unknown' } },
      } as never);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionUpdated (priceIdToTier mapping)', () => {
    beforeEach(() => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
        stripePriceId: 'price_basic',
        currentPeriodStart: new Date(0),
        currentPeriodEnd: new Date(0),
      });
    });

    it('maps a known BASIC price id to tier BASIC', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            cancel_at: null,
            items: {
              data: [
                {
                  price: { id: 'price_basic' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'BASIC', status: 'ACTIVE' }),
        }),
      );
    });

    it('maps a known PRO price id to tier PRO', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            cancel_at: null,
            items: {
              data: [
                {
                  price: { id: 'price_pro' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'PRO', status: 'ACTIVE' }),
        }),
      );
    });

    it('skips the tier field (does not crash) on an unknown price id', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            cancel_at: null,
            items: {
              data: [
                {
                  price: { id: 'price_unknown' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      const updateArg = mockPrisma.subscription.update.mock.calls[0][0];
      expect(updateArg.data.tier).toBeUndefined();
      expect(updateArg.data.status).toBe('ACTIVE');
    });

    it('sets cancelAtPeriodEnd true when cancel_at_period_end is true', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: true,
            cancel_at: 1789246071,
            items: {
              data: [
                {
                  price: { id: 'price_basic' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: true }),
        }),
      );
    });

    it('sets cancelAtPeriodEnd true when cancel_at is set even though cancel_at_period_end is false (billing-portal cancellation payload)', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            cancel_at: 1789246071,
            items: {
              data: [
                {
                  price: { id: 'price_basic' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: true }),
        }),
      );
    });

    it('sets cancelAtPeriodEnd false when both cancel_at_period_end and cancel_at are unset', async () => {
      await service.handleSubscriptionUpdated({
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            cancel_at: null,
            items: {
              data: [
                {
                  price: { id: 'price_basic' },
                  current_period_start: 1700000000,
                  current_period_end: 1702592000,
                },
              ],
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cancelAtPeriodEnd: false }),
        }),
      );
    });
  });

  describe('handleInvoicePaid', () => {
    it('no-ops with a warning when invoice is missing a subscription id', async () => {
      await service.handleInvoicePaid({
        data: { object: { id: 'in_1', customer: 'cus_1', parent: null } },
      } as never);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('no-ops with a warning when no subscription row matches the customer', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleInvoicePaid({
        data: {
          object: {
            id: 'in_1',
            customer: 'cus_unknown',
            parent: {
              type: 'subscription_details',
              subscription_details: { subscription: 'sub_1' },
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('updates status ACTIVE and refreshes period dates/price on renewal', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
        stripePriceId: 'price_basic',
        currentPeriodStart: new Date(0),
        currentPeriodEnd: new Date(0),
      });
      mockStripeClient.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        customer: 'cus_1',
        items: {
          data: [
            {
              price: { id: 'price_basic' },
              current_period_start: 1700000000,
              current_period_end: 1702592000,
            },
          ],
        },
      });

      await service.handleInvoicePaid({
        data: {
          object: {
            id: 'in_1',
            customer: 'cus_1',
            parent: {
              type: 'subscription_details',
              subscription_details: { subscription: 'sub_1' },
            },
          },
        },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: expect.objectContaining({
          tier: 'BASIC',
          status: 'ACTIVE',
          stripeSubscriptionId: 'sub_1',
          stripePriceId: 'price_basic',
          currentPeriodStart: new Date(1700000000 * 1000),
          currentPeriodEnd: new Date(1702592000 * 1000),
        }),
      });
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    it('no-ops with a warning when no subscription row matches the customer', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.handleInvoicePaymentFailed({
        data: { object: { id: 'in_1', customer: 'cus_unknown' } },
      } as never);

      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('sets status PAST_DUE when a subscription row matches the customer', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_1',
      });

      await service.handleInvoicePaymentFailed({
        data: { object: { id: 'in_1', customer: 'cus_1' } },
      } as never);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_1' },
        data: { status: 'PAST_DUE' },
      });
    });
  });

  describe('cancelAllSubscriptionsForCustomer', () => {
    it('lists all subscriptions of the customer across statuses', async () => {
      mockStripeClient.subscriptions.list.mockReturnValue(asyncIterableOf([]));

      await service.cancelAllSubscriptionsForCustomer('cus_1');

      expect(mockStripeClient.subscriptions.list).toHaveBeenCalledWith({
        customer: 'cus_1',
        status: 'all',
        limit: 100,
      });
      expect(mockStripeClient.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it('cancels every non-final subscription immediately without proration', async () => {
      mockStripeClient.subscriptions.list.mockReturnValue(
        asyncIterableOf([
          { id: 'sub_active', status: 'active' },
          { id: 'sub_trialing', status: 'trialing' },
          { id: 'sub_past_due', status: 'past_due' },
          { id: 'sub_unpaid', status: 'unpaid' },
          { id: 'sub_incomplete', status: 'incomplete' },
          { id: 'sub_paused', status: 'paused' },
        ]),
      );

      await service.cancelAllSubscriptionsForCustomer('cus_1');

      expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledTimes(6);
      for (const id of [
        'sub_active',
        'sub_trialing',
        'sub_past_due',
        'sub_unpaid',
        'sub_incomplete',
        'sub_paused',
      ]) {
        expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledWith(id, {
          prorate: false,
          invoice_now: false,
        });
      }
    });

    it('skips canceled and incomplete_expired subscriptions', async () => {
      mockStripeClient.subscriptions.list.mockReturnValue(
        asyncIterableOf([
          { id: 'sub_canceled', status: 'canceled' },
          { id: 'sub_expired', status: 'incomplete_expired' },
          { id: 'sub_active', status: 'active' },
        ]),
      );

      await service.cancelAllSubscriptionsForCustomer('cus_1');

      expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledTimes(1);
      expect(mockStripeClient.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_active',
        { prorate: false, invoice_now: false },
      );
    });

    it('resolves without canceling when the customer no longer exists', async () => {
      mockStripeClient.subscriptions.list.mockReturnValue(
        failingAsyncIterable(
          new stripeErrors.StripeInvalidRequestError({
            code: 'resource_missing',
            message: 'No such customer',
          }),
        ),
      );

      await expect(
        service.cancelAllSubscriptionsForCustomer('cus_gone'),
      ).resolves.toBeUndefined();
      expect(mockStripeClient.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it('rethrows other errors from listing', async () => {
      const error = new stripeErrors.StripeAPIError({ message: 'Stripe down' });
      mockStripeClient.subscriptions.list.mockReturnValue(
        failingAsyncIterable(error),
      );

      await expect(
        service.cancelAllSubscriptionsForCustomer('cus_1'),
      ).rejects.toBe(error);
      expect(mockStripeClient.subscriptions.cancel).not.toHaveBeenCalled();
    });

    it('rethrows a resource_missing error from canceling', async () => {
      const error = new stripeErrors.StripeInvalidRequestError({
        code: 'resource_missing',
        message: 'No such subscription',
      });
      mockStripeClient.subscriptions.list.mockReturnValue(
        asyncIterableOf([{ id: 'sub_active', status: 'active' }]),
      );
      mockStripeClient.subscriptions.cancel.mockRejectedValueOnce(error);

      await expect(
        service.cancelAllSubscriptionsForCustomer('cus_1'),
      ).rejects.toBe(error);
    });

    it('does not touch the database', async () => {
      mockStripeClient.subscriptions.list.mockReturnValue(
        asyncIterableOf([{ id: 'sub_active', status: 'active' }]),
      );
      mockStripeClient.subscriptions.cancel.mockResolvedValue({});

      await service.cancelAllSubscriptionsForCustomer('cus_1');

      expect(mockPrisma.subscription.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });
  });
});
