import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TIER_LIMITS } from '@opticv/datatypes';
import type { UserProfile } from '@opticv/datatypes';
import { Supabase } from '../../core/auth/services/supabase';
import { BillingRedirectService } from '../../core/services/billing-redirect.service';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { Pricing } from './pricing';

type Subscription = NonNullable<UserProfile['subscription']>;

function profileWith(subscription: Subscription | null): UserProfile {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    subscription,
    notifications: { productUpdatesEnabled: true, weeklyTipsEnabled: false },
  };
}

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    tier: 'FREE',
    status: 'ACTIVE',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    ...overrides,
  };
}

type SetupOptions = {
  sessionReady?: boolean;
  user?: { id: string } | null;
  profile?: UserProfile | null;
  profileError?: unknown;
  redirectingToCheckout?: 'BASIC' | 'PRO' | null;
  redirectingToPortal?: boolean;
};

async function setup(options: SetupOptions = {}) {
  const {
    sessionReady = true,
    user = null,
    profile = null,
    profileError = null,
    redirectingToCheckout = null,
    redirectingToPortal = false,
  } = options;

  const supabaseMock = {
    sessionReady: signal(sessionReady).asReadonly(),
    currentUser: signal(user).asReadonly(),
  };
  const userSettingsMock = {
    userProfile: {
      value: signal(profile).asReadonly(),
      hasValue: signal(profile !== null).asReadonly(),
      error: signal(profileError).asReadonly(),
      isLoading: signal(false).asReadonly(),
    },
    reloadUserProfile: vi.fn(),
  };
  const billingMock = {
    startCheckout: vi.fn(),
    openPortal: vi.fn(),
    redirectingToCheckout: signal(redirectingToCheckout).asReadonly(),
    redirectingToPortal: signal(redirectingToPortal).asReadonly(),
  };

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Pricing],
    providers: [
      provideRouter([]),
      { provide: Supabase, useValue: supabaseMock },
      { provide: UserSettingsApiService, useValue: userSettingsMock },
      { provide: BillingRedirectService, useValue: billingMock },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Pricing);
  fixture.detectChanges();

  return { fixture, userSettingsMock, billingMock };
}

function cards(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll('article'));
}

function buttonIn(card: HTMLElement): HTMLButtonElement | null {
  return card.querySelector('button');
}

describe('Pricing', () => {
  describe('content', () => {
    it('renders Free, Basic and Pro cards in order with prices', async () => {
      const { fixture } = await setup();
      const [free, basic, pro] = cards(fixture.nativeElement);

      expect(free.textContent).toContain('Free');
      expect(free.textContent).toContain('$0');
      expect(basic.textContent).toContain('Basic');
      expect(basic.textContent).toContain('$9.90');
      expect(pro.textContent).toContain('Pro');
      expect(pro.textContent).toContain('$19.90');
    });

    it('renders quotas taken from TIER_LIMITS', async () => {
      const { fixture } = await setup();
      const [free, basic, pro] = cards(fixture.nativeElement);

      expect(TIER_LIMITS.FREE.maxStoredCvs).toBe(1);
      expect(free.textContent).toContain('1 CV upload stored');
      expect(free.textContent).toContain('1 CV optimization per month');
      expect(free.textContent).toContain('2 CV templates');
      expect(basic.textContent).toContain('5 CV uploads stored');
      expect(basic.textContent).toContain('10 CV optimizations per month');
      expect(pro.textContent).toContain('10 CV uploads stored');
      expect(pro.textContent).toContain('30 CV optimizations per month');
      expect(pro.textContent).toContain('Multiple ATS-friendly CV templates');
    });

    it('has a single h1', async () => {
      const { fixture } = await setup();

      expect(fixture.nativeElement.querySelectorAll('h1').length).toBe(1);
    });
  });

  describe('logged-out visitor', () => {
    it('shows sign-up wording on every card and enabled buttons', async () => {
      const { fixture } = await setup();
      const buttons = cards(fixture.nativeElement).map(buttonIn);

      expect(buttons[0]?.textContent).toContain('Get started for free');
      expect(buttons[1]?.textContent).toContain('Get Basic');
      expect(buttons[2]?.textContent).toContain('Get Pro');
      expect(buttons.every((b) => b?.disabled === false)).toBe(true);
    });

    it.each([0, 1, 2])(
      'card %i navigates to /login with returnUrl=/pricing',
      async (index) => {
        const { fixture } = await setup();
        const navigateSpy = vi
          .spyOn(TestBed.inject(Router), 'navigate')
          .mockResolvedValue(true);

        buttonIn(cards(fixture.nativeElement)[index])?.click();

        expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
          queryParams: { returnUrl: '/pricing' },
        });
      },
    );

    it('does not reload the profile', async () => {
      const { userSettingsMock } = await setup();

      expect(userSettingsMock.reloadUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('logged-in FREE user', () => {
    const freeUser = {
      user: { id: 'u1' },
      profile: profileWith(subscription()),
    };

    it('reloads the profile on init', async () => {
      const { userSettingsMock } = await setup(freeUser);

      expect(userSettingsMock.reloadUserProfile).toHaveBeenCalledOnce();
    });

    it('marks Free as the current plan and offers upgrades', async () => {
      const { fixture } = await setup(freeUser);
      const [free, basic, pro] = cards(fixture.nativeElement);

      expect(buttonIn(free)?.textContent).toContain('Current plan');
      expect(buttonIn(free)?.disabled).toBe(true);
      expect(buttonIn(basic)?.textContent).toContain('Upgrade to Basic');
      expect(buttonIn(pro)?.textContent).toContain('Upgrade to Pro');
    });

    it('starts checkout for the clicked tier', async () => {
      const { fixture, billingMock } = await setup(freeUser);
      const [, basic, pro] = cards(fixture.nativeElement);

      buttonIn(basic)?.click();
      buttonIn(pro)?.click();

      expect(billingMock.startCheckout).toHaveBeenNthCalledWith(1, 'BASIC');
      expect(billingMock.startCheckout).toHaveBeenNthCalledWith(2, 'PRO');
    });

    it('disables both paid buttons while a checkout redirect is in progress', async () => {
      const { fixture } = await setup({
        ...freeUser,
        redirectingToCheckout: 'BASIC',
      });
      const [, basic, pro] = cards(fixture.nativeElement);

      expect(buttonIn(basic)?.disabled).toBe(true);
      expect(buttonIn(pro)?.disabled).toBe(true);
    });

    it('treats a profile without a subscription as FREE', async () => {
      const { fixture } = await setup({
        user: { id: 'u1' },
        profile: profileWith(null),
      });

      expect(buttonIn(cards(fixture.nativeElement)[0])?.textContent).toContain(
        'Current plan',
      );
    });
  });

  describe('logged-in paid user', () => {
    it.each([
      ['BASIC', 1, 2],
      ['PRO', 2, 1],
    ] as const)(
      'on %s shows Current plan on own card and Manage billing on the other',
      async (tier, ownIndex, otherIndex) => {
        const { fixture, billingMock } = await setup({
          user: { id: 'u1' },
          profile: profileWith(subscription({ tier })),
        });
        const all = cards(fixture.nativeElement);

        expect(buttonIn(all[0])).toBeNull();
        expect(buttonIn(all[ownIndex])?.textContent).toContain('Current plan');
        expect(buttonIn(all[ownIndex])?.disabled).toBe(true);
        expect(buttonIn(all[otherIndex])?.textContent).toContain(
          'Manage billing',
        );

        buttonIn(all[otherIndex])?.click();
        expect(billingMock.openPortal).toHaveBeenCalledOnce();
        expect(billingMock.startCheckout).not.toHaveBeenCalled();
      },
    );

    it.each(['PAST_DUE', 'TRIALING'] as const)(
      'treats a %s subscription as paid',
      async (status) => {
        const { fixture } = await setup({
          user: { id: 'u1' },
          profile: profileWith(subscription({ tier: 'PRO', status })),
        });

        expect(
          buttonIn(cards(fixture.nativeElement)[1])?.textContent,
        ).toContain('Manage billing');
      },
    );

    it('treats a cancel-at-period-end subscription as the current plan', async () => {
      const { fixture } = await setup({
        user: { id: 'u1' },
        profile: profileWith(
          subscription({ tier: 'PRO', cancelAtPeriodEnd: true }),
        ),
      });

      expect(buttonIn(cards(fixture.nativeElement)[2])?.textContent).toContain(
        'Current plan',
      );
    });

    it('treats a CANCELED paid subscription as FREE', async () => {
      const { fixture } = await setup({
        user: { id: 'u1' },
        profile: profileWith(subscription({ tier: 'PRO', status: 'CANCELED' })),
      });

      expect(buttonIn(cards(fixture.nativeElement)[0])?.textContent).toContain(
        'Current plan',
      );
    });

    it('disables Manage billing while the portal redirect is in progress', async () => {
      const { fixture } = await setup({
        user: { id: 'u1' },
        profile: profileWith(subscription({ tier: 'BASIC' })),
        redirectingToPortal: true,
      });

      expect(buttonIn(cards(fixture.nativeElement)[2])?.disabled).toBe(true);
    });
  });

  describe('loading and error states', () => {
    async function expectInert(options: SetupOptions) {
      const { fixture, billingMock } = await setup(options);
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
      const buttons = cards(fixture.nativeElement).map(buttonIn);

      expect(buttons.every((b) => b?.disabled === true)).toBe(true);
      buttons.forEach((b) => b?.click());
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(billingMock.startCheckout).not.toHaveBeenCalled();
      expect(billingMock.openPortal).not.toHaveBeenCalled();
    }

    it('disables CTAs while the session is not ready', async () => {
      await expectInert({ sessionReady: false });
    });

    it('disables CTAs while the profile of a logged-in user is loading', async () => {
      await expectInert({ user: { id: 'u1' }, profile: null });
    });

    it('disables CTAs when the profile failed to load', async () => {
      await expectInert({
        user: { id: 'u1' },
        profile: null,
        profileError: new Error('boom'),
      });
    });
  });
});
