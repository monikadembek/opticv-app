import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { NEVER, of, throwError } from 'rxjs';
import { BillingRedirectService } from './billing-redirect.service';
import { UserSettingsApiService } from './user-settings-api.service';

describe('BillingRedirectService', () => {
  let apiMock: {
    createCheckoutSession: ReturnType<typeof vi.fn>;
    createPortalSession: ReturnType<typeof vi.fn>;
  };
  let location: { href: string };
  let messageService: MessageService;
  let service: BillingRedirectService;

  beforeEach(() => {
    apiMock = {
      createCheckoutSession: vi
        .fn()
        .mockReturnValue(of({ url: 'https://checkout.stripe.com/session' })),
      createPortalSession: vi
        .fn()
        .mockReturnValue(of({ url: 'https://billing.stripe.com/session' })),
    };
    location = { href: '' };

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: UserSettingsApiService, useValue: apiMock },
        { provide: DOCUMENT, useValue: { defaultView: { location } } },
      ],
    });

    messageService = TestBed.inject(MessageService);
    service = TestBed.inject(BillingRedirectService);
  });

  describe('startCheckout', () => {
    it('creates a checkout session for the tier and redirects to its url', () => {
      service.startCheckout('PRO');

      expect(apiMock.createCheckoutSession).toHaveBeenCalledWith('PRO');
      expect(location.href).toBe('https://checkout.stripe.com/session');
    });

    it('exposes the tier being redirected while the request is in flight', () => {
      apiMock.createCheckoutSession.mockReturnValue(NEVER);

      service.startCheckout('BASIC');

      expect(service.redirectingToCheckout()).toBe('BASIC');
    });

    it('shows an error toast and resets the state on failure', () => {
      apiMock.createCheckoutSession.mockReturnValue(
        throwError(() => ({ error: { message: 'Nope' } })),
      );
      const addSpy = vi.spyOn(messageService, 'add');

      service.startCheckout('BASIC');

      expect(addSpy).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Checkout Error',
        detail: 'Nope',
      });
      expect(service.redirectingToCheckout()).toBeNull();
      expect(location.href).toBe('');
    });

    it('falls back to a generic message when the error has no message', () => {
      apiMock.createCheckoutSession.mockReturnValue(throwError(() => ({})));
      const addSpy = vi.spyOn(messageService, 'add');

      service.startCheckout('BASIC');

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Failed to start checkout. Please try again.',
        }),
      );
    });

    it('ignores a second call while a redirect is in progress', () => {
      apiMock.createCheckoutSession.mockReturnValue(NEVER);

      service.startCheckout('BASIC');
      service.startCheckout('PRO');
      service.openPortal();

      expect(apiMock.createCheckoutSession).toHaveBeenCalledOnce();
      expect(apiMock.createPortalSession).not.toHaveBeenCalled();
    });
  });

  describe('openPortal', () => {
    it('creates a portal session and redirects to its url', () => {
      service.openPortal();

      expect(apiMock.createPortalSession).toHaveBeenCalledOnce();
      expect(location.href).toBe('https://billing.stripe.com/session');
    });

    it('exposes the in-flight state', () => {
      apiMock.createPortalSession.mockReturnValue(NEVER);

      service.openPortal();

      expect(service.redirectingToPortal()).toBe(true);
    });

    it('shows an error toast and resets the state on failure', () => {
      apiMock.createPortalSession.mockReturnValue(
        throwError(() => ({ error: { message: 'Portal down' } })),
      );
      const addSpy = vi.spyOn(messageService, 'add');

      service.openPortal();

      expect(addSpy).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Billing Portal Error',
        detail: 'Portal down',
      });
      expect(service.redirectingToPortal()).toBe(false);
    });

    it('ignores a second call while a redirect is in progress', () => {
      apiMock.createPortalSession.mockReturnValue(NEVER);

      service.openPortal();
      service.openPortal();
      service.startCheckout('BASIC');

      expect(apiMock.createPortalSession).toHaveBeenCalledOnce();
      expect(apiMock.createCheckoutSession).not.toHaveBeenCalled();
    });
  });
});
