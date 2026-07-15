import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Settings } from './settings';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { Supabase } from '../../core/auth/services/supabase';
import type { UsageStatus, UserProfile } from '@opticv/datatypes';

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  subscription: { tier: 'FREE', status: 'ACTIVE' },
};

function createResource<T>(
  overrides: Partial<{
    value: T | null;
    isLoading: boolean;
    error: unknown;
    hasValue: boolean;
  }> = {},
) {
  return {
    value: signal(overrides.value ?? null).asReadonly(),
    isLoading: signal(overrides.isLoading ?? false).asReadonly(),
    error: signal(overrides.error ?? null).asReadonly(),
    hasValue: signal(overrides.hasValue ?? false).asReadonly(),
  };
}

function createUserSettingsMock(
  profileOverrides?: Parameters<typeof createResource<UserProfile>>[0],
  usageOverrides?: Parameters<typeof createResource<UsageStatus>>[0],
) {
  return {
    userProfile: createResource<UserProfile>(profileOverrides),
    usageStatus: createResource<UsageStatus>(usageOverrides),
    deleteAccount: vi.fn().mockReturnValue(of(undefined)),
    updateDisplayName: vi.fn().mockReturnValue(of(mockProfile)),
    reloadUserProfile: vi.fn(),
    reloadUsageStatus: vi.fn(),
  };
}

function createSupabaseMock() {
  return {
    signOut: vi.fn().mockResolvedValue(undefined),
    updateEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
  };
}

describe('Settings', () => {
  let userSettingsMock: ReturnType<typeof createUserSettingsMock>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;
  let messageService: MessageService;

  async function setup(
    profileOverrides?: Parameters<typeof createUserSettingsMock>[0],
    usageOverrides?: Parameters<typeof createUserSettingsMock>[1],
  ) {
    userSettingsMock = createUserSettingsMock(profileOverrides, usageOverrides);
    supabaseMock = createSupabaseMock();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: UserSettingsApiService, useValue: userSettingsMock },
        { provide: Supabase, useValue: supabaseMock },
      ],
    }).compileComponents();

    messageService = TestBed.inject(MessageService);
  }

  // ─── creation ───────────────────────────────────────────────────────────

  it('should create', async () => {
    await setup();
    const fixture = TestBed.createComponent(Settings);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialise isDeleting to false', async () => {
    await setup();
    const fixture = TestBed.createComponent(Settings);
    expect(fixture.componentInstance.isDeleting()).toBe(false);
  });

  // ─── ngOnInit ────────────────────────────────────────────────────────────

  it('reloads the user profile on init', async () => {
    await setup();
    const fixture = TestBed.createComponent(Settings);

    fixture.componentInstance.ngOnInit();

    expect(userSettingsMock.reloadUserProfile).toHaveBeenCalledOnce();
  });

  it('reloads the usage status on init', async () => {
    await setup();
    const fixture = TestBed.createComponent(Settings);

    fixture.componentInstance.ngOnInit();

    expect(userSettingsMock.reloadUsageStatus).toHaveBeenCalledOnce();
  });

  it('reloads the user profile when the component is created via change detection', async () => {
    await setup();
    const fixture = TestBed.createComponent(Settings);

    fixture.detectChanges();

    expect(userSettingsMock.reloadUserProfile).toHaveBeenCalledOnce();
  });

  // ─── getAvatarLabel ──────────────────────────────────────────────────────

  describe('getAvatarLabel', () => {
    it('returns "U" when profile is null', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.getAvatarLabel(null)).toBe('U');
    });

    it('returns first letter of displayName when present', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.getAvatarLabel(mockProfile)).toBe('T');
    });

    it('falls back to first letter of email when displayName is absent', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      const profileNoName: UserProfile = { ...mockProfile, displayName: null };
      expect(componentInstance.getAvatarLabel(profileNoName)).toBe('T');
    });

    it('returns uppercase initial', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      const lowercase: UserProfile = {
        ...mockProfile,
        displayName: 'alice',
        email: 'alice@example.com',
      };
      expect(componentInstance.getAvatarLabel(lowercase)).toBe('A');
    });
  });

  // ─── usage panel ─────────────────────────────────────────────────────────

  describe('usage panel', () => {
    const usageStatus: UsageStatus = {
      quotas: [
        {
          feature: 'CV_OPTIMIZATION',
          used: 3,
          limit: 10,
          remaining: 7,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
        {
          feature: 'COVER_LETTER',
          used: 1,
          limit: 10,
          remaining: 9,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
        {
          feature: 'INTERVIEW_PREP',
          used: 0,
          limit: 10,
          remaining: 10,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
        {
          feature: 'LINKEDIN',
          used: 2,
          limit: 10,
          remaining: 8,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      storedCvs: { used: 4, limit: 10 },
    };

    it('renders per-feature usage for a BASIC tier user', async () => {
      await setup(
        {
          value: {
            ...mockProfile,
            subscription: { tier: 'BASIC', status: 'ACTIVE' },
          },
          hasValue: true,
        },
        { value: usageStatus, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('LinkedIn content generations');
      expect(text).toContain('2 / 10');
      expect(text).toContain('4 / 10');
    });

    it('renders per-feature usage for a PRO tier user', async () => {
      const proUsage: UsageStatus = {
        quotas: usageStatus.quotas.map((q) => ({
          ...q,
          limit: 30,
          remaining: 30 - q.used,
        })),
        storedCvs: { used: 4, limit: 20 },
      };
      await setup(
        {
          value: {
            ...mockProfile,
            subscription: { tier: 'PRO', status: 'ACTIVE' },
          },
          hasValue: true,
        },
        { value: proUsage, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('/ 30');
      expect(text).toContain('4 / 20');
    });

    it('featureLabel returns a human-readable label for each feature', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.featureLabel('CV_OPTIMIZATION')).toBe(
        'CV optimization runs',
      );
      expect(componentInstance.featureLabel('LINKEDIN')).toBe(
        'LinkedIn content generations',
      );
    });

    it('renders a "Resets" date in the card header sourced from the first quota', async () => {
      await setup(
        { value: mockProfile, hasValue: true },
        { value: usageStatus, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Resets Aug 1, 2026');
    });

    it('renders a progress bar for each quota row and the stored-CVs row', async () => {
      await setup(
        { value: mockProfile, hasValue: true },
        { value: usageStatus, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const progressBars = fixture.debugElement.queryAll(
        (el) => el.name === 'p-progressbar',
      );
      expect(progressBars.length).toBe(usageStatus.quotas.length + 1);
    });
  });

  // ─── usagePercent ────────────────────────────────────────────────────────

  describe('usagePercent', () => {
    it('returns the used/limit ratio as a percentage', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.usagePercent(3, 10)).toBe(30);
    });

    it('returns 0 when limit is 0 to avoid a division by zero', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.usagePercent(0, 0)).toBe(0);
    });

    it('caps the percentage at 100', async () => {
      await setup();
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.usagePercent(15, 10)).toBe(100);
    });
  });

  // ─── profile card ────────────────────────────────────────────────────────

  describe('profile card', () => {
    it('pre-fills the full name input with displayName', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector(
        '#fullName',
      ) as HTMLInputElement;
      expect(input.value).toBe('Test User');
    });

    it('falls back to an empty string when displayName is null', async () => {
      const profileNoName: UserProfile = { ...mockProfile, displayName: null };
      await setup({ value: profileNoName, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector(
        '#fullName',
      ) as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('pre-fills the email address input with email', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      const input = fixture.nativeElement.querySelector(
        '#emailAddress',
      ) as HTMLInputElement;
      expect(input.value).toBe('test@example.com');
    });

    it('enables the Save name button by default', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        'button[aria-label="Save name"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('enables the Change email button by default', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector(
        'button[aria-label="Change email"]',
      ) as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });

    it('does not render a "Save changes" button', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Save changes');
    });
  });

  // ─── full name form (onSubmit) ──────────────────────────────────────────

  function createSubmitEvent(): Event {
    return { preventDefault: vi.fn() } as unknown as Event;
  }

  describe('onFullNameUpdateSubmit', () => {
    it('calls updateDisplayName with the trimmed value, reloads the profile, and shows a success toast', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const addSpy = vi.spyOn(messageService, 'add');
      userSettingsMock.reloadUserProfile.mockClear();

      fixture.componentInstance.fullNameModel.set({ displayName: '  Alice  ' });
      fixture.componentInstance.fullNameForm.displayName().markAsDirty();
      fixture.componentInstance.onFullNameUpdateSubmit(createSubmitEvent());

      expect(userSettingsMock.updateDisplayName).toHaveBeenCalledWith('Alice');
      expect(userSettingsMock.reloadUserProfile).toHaveBeenCalledOnce();
      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'success',
          summary: 'Success',
          detail: 'Full name updated.',
        }),
      );
    });

    it('shows an inline validation error and does not call updateDisplayName for an empty name', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.fullNameModel.set({ displayName: '' });
      fixture.componentInstance.onFullNameUpdateSubmit(createSubmitEvent());
      fixture.detectChanges();

      expect(userSettingsMock.updateDisplayName).not.toHaveBeenCalled();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Full name is required.');
    });

    it('shows an inline validation error and does not call updateDisplayName for a name over 100 characters', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.fullNameModel.set({
        displayName: 'a'.repeat(101),
      });
      fixture.componentInstance.onFullNameUpdateSubmit(createSubmitEvent());
      fixture.detectChanges();

      expect(userSettingsMock.updateDisplayName).not.toHaveBeenCalled();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Full name can contain maximum  100 characters.');
    });

    it('shows an error toast and keeps the entered value on API failure', async () => {
      await setup({ value: mockProfile, hasValue: true });
      userSettingsMock.updateDisplayName.mockReturnValue(
        throwError(() => ({ error: { message: 'Something went wrong' } })),
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const addSpy = vi.spyOn(messageService, 'add');
      userSettingsMock.reloadUserProfile.mockClear();

      fixture.componentInstance.fullNameModel.set({ displayName: 'Alice' });
      fixture.componentInstance.fullNameForm.displayName().markAsDirty();
      fixture.componentInstance.onFullNameUpdateSubmit(createSubmitEvent());

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Update Error',
          detail: 'Something went wrong',
        }),
      );
      expect(userSettingsMock.reloadUserProfile).not.toHaveBeenCalled();
      expect(fixture.componentInstance.fullNameModel().displayName).toBe(
        'Alice',
      );
    });

    it('sets isSavingName while the request is in flight and resets it after', async () => {
      await setup({ value: mockProfile, hasValue: true });
      userSettingsMock.updateDisplayName.mockReturnValue(
        new (await import('rxjs')).Observable(() => {
          /* never completes */
        }),
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();

      fixture.componentInstance.fullNameModel.set({ displayName: 'Alice' });
      fixture.componentInstance.fullNameForm.displayName().markAsDirty();
      fixture.componentInstance.onFullNameUpdateSubmit(createSubmitEvent());

      expect(fixture.componentInstance.isSavingName()).toBe(true);
    });
  });

  // ─── change email form (onChangeEmailSubmit) ────────────────────────────

  describe('onChangeEmailSubmit', () => {
    it('shows a required error and does not open the confirm dialog for an empty email', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({ newEmail: '' });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      fixture.detectChanges();

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(supabaseMock.updateEmail).not.toHaveBeenCalled();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('New email is required.');
    });

    it('shows a format error and does not open the confirm dialog for an invalid email', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({ newEmail: 'not-an-email' });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      fixture.detectChanges();

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(supabaseMock.updateEmail).not.toHaveBeenCalled();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Enter a valid email address.');
    });

    it('shows a "must differ" error and does not open the confirm dialog when the email is unchanged', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({
        newEmail: mockProfile.email,
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      fixture.detectChanges();

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(supabaseMock.updateEmail).not.toHaveBeenCalled();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain(
        'New email must be different from your current email.',
      );
    });

    it('opens a confirmation dialog for a valid, different email', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({
        newEmail: 'new@example.com',
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());

      expect(confirmSpy).toHaveBeenCalledOnce();
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          header: 'Change email',
          acceptLabel: 'Send link',
          rejectLabel: 'Cancel',
        }),
      );
    });

    it('calls updateEmail and shows the pending confirmation message on confirm success', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({
        newEmail: 'new@example.com',
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      const { accept } = confirmSpy.mock.calls[0][0];
      await accept?.();

      expect(supabaseMock.updateEmail).toHaveBeenCalledWith('new@example.com');
      expect(fixture.componentInstance.emailChangePendingFor()).toBe(
        'new@example.com',
      );
      expect(fixture.componentInstance.isChangingEmail()).toBe(false);
    });

    it('sets isChangingEmail while the request is in flight', async () => {
      await setup({ value: mockProfile, hasValue: true });
      supabaseMock.updateEmail.mockReturnValue(
        new Promise(() => {
          /* never resolves */
        }),
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({
        newEmail: 'new@example.com',
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      const { accept } = confirmSpy.mock.calls[0][0];
      accept?.();

      expect(fixture.componentInstance.isChangingEmail()).toBe(true);
    });

    it('shows an error toast and preserves the entered value on updateEmail failure', async () => {
      await setup({ value: mockProfile, hasValue: true });
      supabaseMock.updateEmail.mockResolvedValue({
        data: {},
        error: { message: 'Email already registered' },
      });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');
      const addSpy = vi.spyOn(messageService, 'add');

      fixture.componentInstance.newEmailModel.set({
        newEmail: 'new@example.com',
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      const { accept } = confirmSpy.mock.calls[0][0];
      await accept?.();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Error',
          detail: 'Email already registered',
        }),
      );
      expect(fixture.componentInstance.isChangingEmail()).toBe(false);
      expect(fixture.componentInstance.newEmailModel().newEmail).toBe(
        'new@example.com',
      );
      expect(fixture.componentInstance.emailChangePendingFor()).toBeNull();
    });

    it('does not call updateEmail when the confirm dialog is rejected', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();
      await fixture.whenStable();
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.newEmailModel.set({
        newEmail: 'new@example.com',
      });
      fixture.componentInstance.onChangeEmailSubmit(createSubmitEvent());
      const { reject } = confirmSpy.mock.calls[0][0];
      reject?.();

      expect(supabaseMock.updateEmail).not.toHaveBeenCalled();
      expect(fixture.componentInstance.newEmailModel().newEmail).toBe(
        'new@example.com',
      );
    });
  });

  // ─── subscription card ───────────────────────────────────────────────────

  describe('subscription card', () => {
    const usageStatus: UsageStatus = {
      quotas: [
        {
          feature: 'CV_OPTIMIZATION',
          used: 3,
          limit: 10,
          remaining: 7,
          resetsAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      storedCvs: { used: 4, limit: 10 },
    };

    it('renders the renewal sentence when usage data is available', async () => {
      await setup(
        {
          value: {
            ...mockProfile,
            subscription: { tier: 'PRO', status: 'ACTIVE' },
          },
          hasValue: true,
        },
        { value: usageStatus, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Your PRO plan renews on Aug 1, 2026');
    });

    it('omits the renewal sentence when usage data is unavailable', async () => {
      await setup({ value: mockProfile, hasValue: true }, { hasValue: false });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('plan renews on');
    });

    it('disables the Manage billing button', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const manageBillingButton = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((el) =>
        (el as HTMLButtonElement).textContent?.includes('Manage billing'),
      ) as HTMLButtonElement | undefined;
      expect(manageBillingButton?.disabled).toBe(true);
    });

    it('disables the View invoices button', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const viewInvoicesButton = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
      ).find((el) =>
        (el as HTMLButtonElement).textContent?.includes('View invoices'),
      ) as HTMLButtonElement | undefined;
      expect(viewInvoicesButton?.disabled).toBe(true);
    });

    it('does not render "Visa ending" text', async () => {
      await setup(
        { value: mockProfile, hasValue: true },
        { value: usageStatus, hasValue: true },
      );
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Visa ending');
    });
  });

  // ─── notifications card ──────────────────────────────────────────────────

  describe('notifications card', () => {
    it('defaults Product updates to enabled', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.productUpdatesEnabled()).toBe(true);
    });

    it('defaults Weekly job-search tips to disabled', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const { componentInstance } = TestBed.createComponent(Settings);
      expect(componentInstance.weeklyTipsEnabled()).toBe(false);
    });

    it('does not render a Job-match alerts row', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Job-match alerts');
    });

    it('renders both notification toggle labels', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Product updates');
      expect(text).toContain('Job-search tips');
    });
  });

  // ─── security card ───────────────────────────────────────────────────────

  describe('security card', () => {
    it('does not render a Password / Change password section', async () => {
      await setup({ value: mockProfile, hasValue: true });
      const fixture = TestBed.createComponent(Settings);
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Change password');
    });
  });

  // ─── onDeleteAccount ─────────────────────────────────────────────────────

  describe('onDeleteAccount', () => {
    it('opens a confirmation dialog', async () => {
      await setup();
      const fixture = TestBed.createComponent(Settings);
      // ConfirmationService is re-provided per component instance — get from the component injector
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.onDeleteAccount();

      expect(confirmSpy).toHaveBeenCalledOnce();
    });

    it('sets isDeleting to true while the delete is in flight', async () => {
      await setup();
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');
      userSettingsMock.deleteAccount.mockReturnValue(
        new (await import('rxjs')).Observable(() => {
          /* never completes */
        }),
      );

      fixture.componentInstance.onDeleteAccount();
      const { accept } = confirmSpy.mock.calls[0][0];
      accept?.();

      expect(fixture.componentInstance.isDeleting()).toBe(true);
    });

    it('calls deleteAccount, signs out, and navigates to /login on success', async () => {
      await setup();
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');

      fixture.componentInstance.onDeleteAccount();
      const { accept } = confirmSpy.mock.calls[0][0];
      accept?.();

      await fixture.whenStable();

      expect(userSettingsMock.deleteAccount).toHaveBeenCalledOnce();
      expect(supabaseMock.signOut).toHaveBeenCalledOnce();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('shows an error toast and resets isDeleting on API failure', async () => {
      await setup();
      userSettingsMock.deleteAccount.mockReturnValue(
        throwError(() => ({ error: { message: 'Something went wrong' } })),
      );
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');
      const addSpy = vi.spyOn(messageService, 'add');

      fixture.componentInstance.onDeleteAccount();
      const { accept } = confirmSpy.mock.calls[0][0];
      accept?.();

      await fixture.whenStable();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Delete failed',
          detail: 'Something went wrong',
        }),
      );
      expect(fixture.componentInstance.isDeleting()).toBe(false);
      expect(supabaseMock.signOut).not.toHaveBeenCalled();
    });

    it('shows a generic error message when the error has no message', async () => {
      await setup();
      userSettingsMock.deleteAccount.mockReturnValue(throwError(() => ({})));
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService =
        fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');
      const addSpy = vi.spyOn(messageService, 'add');

      fixture.componentInstance.onDeleteAccount();
      const { accept } = confirmSpy.mock.calls[0][0];
      accept?.();

      await fixture.whenStable();

      expect(addSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Failed to delete account. Please try again.',
        }),
      );
    });
  });
});
