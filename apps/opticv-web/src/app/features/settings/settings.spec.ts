import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Settings } from './settings';
import { UserSettingsApiService } from './services/user-settings-api.service';
import { Supabase } from '../../core/auth/services/supabase';
import type { UserProfile } from '@opticv/datatypes';

const mockProfile: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  subscription: { tier: 'FREE', status: 'ACTIVE' },
};

function createUserProfileResource(overrides: Partial<{
  value: UserProfile | null;
  isLoading: boolean;
  error: unknown;
  hasValue: boolean;
}> = {}) {
  return {
    value: signal(overrides.value ?? null).asReadonly(),
    isLoading: signal(overrides.isLoading ?? false).asReadonly(),
    error: signal(overrides.error ?? null).asReadonly(),
    hasValue: signal(overrides.hasValue ?? false).asReadonly(),
  };
}

function createUserSettingsMock(profileOverrides?: Parameters<typeof createUserProfileResource>[0]) {
  return {
    userProfile: createUserProfileResource(profileOverrides),
    deleteAccount: vi.fn().mockReturnValue(of(undefined)),
    reloadUserProfile: vi.fn(),
  };
}

function createSupabaseMock() {
  return {
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Settings', () => {
  let userSettingsMock: ReturnType<typeof createUserSettingsMock>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;
  let messageService: MessageService;

  async function setup(profileOverrides?: Parameters<typeof createUserSettingsMock>[0]) {
    userSettingsMock = createUserSettingsMock(profileOverrides);
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

  // ─── onDeleteAccount ─────────────────────────────────────────────────────

  describe('onDeleteAccount', () => {
    it('opens a confirmation dialog', async () => {
      await setup();
      const fixture = TestBed.createComponent(Settings);
      // ConfirmationService is re-provided per component instance — get from the component injector
      const componentConfirmService = fixture.debugElement.injector.get(ConfirmationService);
      const confirmSpy = vi.spyOn(componentConfirmService, 'confirm');

      fixture.componentInstance.onDeleteAccount();

      expect(confirmSpy).toHaveBeenCalledOnce();
    });

    it('sets isDeleting to true while the delete is in flight', async () => {
      await setup();
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService = fixture.debugElement.injector.get(ConfirmationService);
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
      const componentConfirmService = fixture.debugElement.injector.get(ConfirmationService);
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
      const componentConfirmService = fixture.debugElement.injector.get(ConfirmationService);
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
      userSettingsMock.deleteAccount.mockReturnValue(
        throwError(() => ({})),
      );
      const fixture = TestBed.createComponent(Settings);
      const componentConfirmService = fixture.debugElement.injector.get(ConfirmationService);
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
