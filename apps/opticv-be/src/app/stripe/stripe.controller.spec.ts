import { BadRequestException, CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import type { UserModel } from '../../generated/prisma/models.js';

const allowAllGuard: CanActivate = { canActivate: () => true };

const mockUser = {
  id: 'user-1',
  supabaseId: 'sb-1',
  email: 'a@b.com',
} as unknown as UserModel;

const mockStripeService = {
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
  verifyAndConstructEvent: jest.fn(),
  handleCheckoutSessionCompleted: jest.fn(),
  handleSubscriptionUpdated: jest.fn(),
  handleSubscriptionDeleted: jest.fn(),
  handleInvoicePaid: jest.fn(),
  handleInvoicePaymentFailed: jest.fn(),
};

describe('StripeController', () => {
  let controller: StripeController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [{ provide: StripeService, useValue: mockStripeService }],
    })
      .overrideGuard(SupabaseGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get(StripeController);
  });

  describe('createCheckoutSession', () => {
    it('delegates to service with the authenticated user id/email and dto tier', async () => {
      mockStripeService.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/x',
      });

      const result = await controller.createCheckoutSession(mockUser, {
        tier: 'BASIC',
      });

      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        'user-1',
        'a@b.com',
        'BASIC',
      );
      expect(result).toEqual({ url: 'https://checkout.stripe.com/x' });
    });
  });

  describe('createPortalSession', () => {
    it('delegates to service with the authenticated user id', async () => {
      mockStripeService.createPortalSession.mockResolvedValue({
        url: 'https://billing.stripe.com/x',
      });

      const result = await controller.createPortalSession(mockUser);

      expect(mockStripeService.createPortalSession).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual({ url: 'https://billing.stripe.com/x' });
    });
  });

  describe('handleWebhook', () => {
    const buildRequest = (rawBody?: Buffer) =>
      ({ rawBody }) as never;

    it('returns 400 on signature failure', async () => {
      mockStripeService.verifyAndConstructEvent.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(
        controller.handleWebhook(buildRequest(Buffer.from('body')), 'sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns { received: true } and no-ops for an unhandled event type', async () => {
      mockStripeService.verifyAndConstructEvent.mockReturnValue({
        type: 'invoice.created',
      });

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(result).toEqual({ received: true });
      expect(
        mockStripeService.handleCheckoutSessionCompleted,
      ).not.toHaveBeenCalled();
    });

    it('delegates checkout.session.completed to the service and returns { received: true }', async () => {
      const event = { type: 'checkout.session.completed' };
      mockStripeService.verifyAndConstructEvent.mockReturnValue(event);

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(
        mockStripeService.handleCheckoutSessionCompleted,
      ).toHaveBeenCalledWith(event);
      expect(result).toEqual({ received: true });
    });

    it('delegates customer.subscription.updated to the service and returns { received: true }', async () => {
      const event = { type: 'customer.subscription.updated' };
      mockStripeService.verifyAndConstructEvent.mockReturnValue(event);

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(mockStripeService.handleSubscriptionUpdated).toHaveBeenCalledWith(
        event,
      );
      expect(result).toEqual({ received: true });
    });

    it('delegates customer.subscription.deleted to the service and returns { received: true }', async () => {
      const event = { type: 'customer.subscription.deleted' };
      mockStripeService.verifyAndConstructEvent.mockReturnValue(event);

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(mockStripeService.handleSubscriptionDeleted).toHaveBeenCalledWith(
        event,
      );
      expect(result).toEqual({ received: true });
    });

    it('delegates invoice.paid to the service and returns { received: true }', async () => {
      const event = { type: 'invoice.paid' };
      mockStripeService.verifyAndConstructEvent.mockReturnValue(event);

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(mockStripeService.handleInvoicePaid).toHaveBeenCalledWith(event);
      expect(result).toEqual({ received: true });
    });

    it('delegates invoice.payment_failed to the service and returns { received: true }', async () => {
      const event = { type: 'invoice.payment_failed' };
      mockStripeService.verifyAndConstructEvent.mockReturnValue(event);

      const result = await controller.handleWebhook(
        buildRequest(Buffer.from('body')),
        'sig',
      );

      expect(
        mockStripeService.handleInvoicePaymentFailed,
      ).toHaveBeenCalledWith(event);
      expect(result).toEqual({ received: true });
    });
  });
});
