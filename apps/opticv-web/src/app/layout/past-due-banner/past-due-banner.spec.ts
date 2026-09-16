import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Signal, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import type { UserProfile } from '@opticv/datatypes';
import { PastDueBanner } from './past-due-banner';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';

function createResource<T>(value: T | null) {
  return { value: signal(value).asReadonly() };
}

function baseProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    subscription: {
      tier: 'PRO',
      status: 'PAST_DUE',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    },
    notifications: { productUpdatesEnabled: true, weeklyTipsEnabled: false },
    ...overrides,
  };
}

describe('PastDueBanner', () => {
  let fixture: ComponentFixture<PastDueBanner>;
  let component: PastDueBanner;
  let userSettingsMock: {
    userProfile: { value: Signal<UserProfile | null> };
    createPortalSession: ReturnType<typeof vi.fn>;
  };
  let messageService: MessageService;

  async function setup(profile: UserProfile | null) {
    userSettingsMock = {
      userProfile: createResource(profile),
      createPortalSession: vi
        .fn()
        .mockReturnValue(of({ url: 'https://billing.stripe.com/session' })),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PastDueBanner],
      providers: [
        MessageService,
        { provide: UserSettingsApiService, useValue: userSettingsMock },
      ],
    }).compileComponents();

    messageService = TestBed.inject(MessageService);
    fixture = TestBed.createComponent(PastDueBanner);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('is visible when subscription status is PAST_DUE', async () => {
    await setup(baseProfile());
    expect(component.visible()).toBe(true);
  });

  it('is hidden when subscription status is ACTIVE', async () => {
    await setup(
      baseProfile({
        subscription: {
          tier: 'PRO',
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        },
      }),
    );
    expect(component.visible()).toBe(false);
  });

  it('is hidden when there is no subscription', async () => {
    await setup(baseProfile({ subscription: null }));
    expect(component.visible()).toBe(false);
  });

  it('is hidden when userProfile has not loaded', async () => {
    await setup(null);
    expect(component.visible()).toBe(false);
  });

  it('hides after dismiss is clicked, even while status remains PAST_DUE', async () => {
    await setup(baseProfile());
    expect(component.visible()).toBe(true);

    component.onDismiss();

    expect(component.visible()).toBe(false);
  });

  it('calls createPortalSession and redirects on Manage billing', async () => {
    await setup(baseProfile());

    component.onManageBilling();

    expect(userSettingsMock.createPortalSession).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast and keeps the banner visible when createPortalSession fails', async () => {
    await setup(baseProfile());
    userSettingsMock.createPortalSession.mockReturnValue(
      throwError(() => ({ error: { message: 'No billing account' } })),
    );
    const addSpy = vi.spyOn(messageService, 'add');

    component.onManageBilling();

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    expect(component.visible()).toBe(true);
    expect(component.isRedirectingToPortal()).toBe(false);
  });
});
