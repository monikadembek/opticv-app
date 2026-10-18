import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Settings } from './settings';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { Supabase } from '../../core/auth/services/supabase';
import { CookieConsentStore } from '../../core/stores/cookie-consent.store';
import type { UserProfile } from '@opticv/datatypes';

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  subscription: {
    tier: 'FREE',
    status: 'ACTIVE',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  },
  notifications: { productUpdatesEnabled: true, weeklyTipsEnabled: false },
};

function createResource<T>(value: T | null) {
  return {
    value: signal(value).asReadonly(),
    isLoading: signal(false).asReadonly(),
    error: signal(null).asReadonly(),
    hasValue: signal(value !== null).asReadonly(),
  };
}

describe('Settings privacy section', () => {
  async function setup() {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        MessageService,
        {
          provide: UserSettingsApiService,
          useValue: {
            userProfile: createResource<UserProfile>(mockProfile),
            usageStatus: createResource(null),
            reloadUserProfile: vi.fn(),
            reloadUsageStatus: vi.fn(),
            updateNotificationPreference: vi
              .fn()
              .mockReturnValue(of(mockProfile)),
          },
        },
        { provide: Supabase, useValue: { signOut: vi.fn() } },
      ],
    }).compileComponents();

    const store = TestBed.inject(CookieConsentStore);
    const fixture = TestBed.createComponent(Settings);
    return { store, fixture };
  }

  it('renders the Privacy section with the Analytics cookies toggle', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();

    const section: HTMLElement | null = fixture.nativeElement.querySelector(
      'section[aria-label="Privacy"]',
    );
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain('Analytics cookies');
    expect(section?.querySelector('p-toggleswitch')).not.toBeNull();
  });

  it('shows the toggle as off when no decision has been made', async () => {
    const { fixture } = await setup();

    expect(fixture.componentInstance.analyticsCookiesEnabled()).toBe(false);
  });

  it('shows the toggle as on when analytics cookies are accepted', async () => {
    const { store, fixture } = await setup();
    store.accept();

    expect(fixture.componentInstance.analyticsCookiesEnabled()).toBe(true);
  });

  it('shows the toggle as off when analytics cookies are rejected', async () => {
    const { store, fixture } = await setup();
    store.reject();

    expect(fixture.componentInstance.analyticsCookiesEnabled()).toBe(false);
  });

  it('accepts analytics cookies when the toggle is turned on', async () => {
    const { store, fixture } = await setup();

    fixture.componentInstance.onAnalyticsCookiesToggle(true);

    expect(store.status()).toBe('accepted');
  });

  it('rejects analytics cookies when the toggle is turned off', async () => {
    const { store, fixture } = await setup();
    store.accept();

    fixture.componentInstance.onAnalyticsCookiesToggle(false);

    expect(store.status()).toBe('rejected');
  });

  it('closes a reopened banner when the toggle is changed', async () => {
    const { store, fixture } = await setup();
    store.reopenBanner();

    fixture.componentInstance.onAnalyticsCookiesToggle(true);

    expect(store.isBannerVisible()).toBe(false);
  });
});
