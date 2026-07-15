import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { VerifyEmailChange } from './verify-email-change';
import { Supabase } from '../../services/supabase';

function createSupabaseMock(
  pendingEmailChange: string | null = 'new@example.com',
  otpResult: { data: { session: any }; error: any } = { data: { session: {} }, error: null },
) {
  return {
    pendingEmailChange: signal(pendingEmailChange).asReadonly(),
    verifyEmailChange: vi.fn().mockResolvedValue(otpResult),
    setPendingEmailChange: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

function buildForm(code: string, valid = true) {
  return {
    valid,
    form: { value: { code } },
    resetForm: vi.fn(),
  } as any;
}

describe('VerifyEmailChange', () => {
  let component: VerifyEmailChange;
  let fixture: ComponentFixture<VerifyEmailChange>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    supabaseMock = createSupabaseMock();

    await TestBed.configureTestingModule({
      imports: [VerifyEmailChange],
      providers: [
        provideRouter([]),
        { provide: Supabase, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailChange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize code to empty string', () => {
    expect(component.code).toBe('');
  });

  it('should initialize errorMessage signal to empty string', () => {
    expect(component.errorMessage()).toBe('');
  });

  it('should compute isEmailChangePending as true when pendingEmailChange is set', () => {
    expect(component.isEmailChangePending()).toBe(true);
  });

  it('should render the verify heading', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('Confirm your new email');
  });

  describe('ngOnInit() — with pending email change', () => {
    it('should not navigate when pending email change is set', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.ngOnInit();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit()', () => {
    it('should call supabase.verifyEmailChange with the code and pending email change', async () => {
      await component.onSubmit(buildForm('123456'));
      expect(supabaseMock.verifyEmailChange).toHaveBeenCalledWith(
        '123456',
        'new@example.com',
      );
    });

    it('should clear pendingEmailChange, sign out, and navigate to /login on success', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      const form = buildForm('123456');

      await component.onSubmit(form);

      expect(supabaseMock.setPendingEmailChange).toHaveBeenCalledWith(null);
      expect(supabaseMock.signOut).toHaveBeenCalledOnce();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should set errorMessage when verifyEmailChange returns an error', async () => {
      supabaseMock.verifyEmailChange.mockResolvedValue({
        data: { session: null },
        error: { message: 'invalid otp' },
      });
      await component.onSubmit(buildForm('000000'));
      expect(component.errorMessage()).toBe(
        'Invalid or expired code. Please try again.',
      );
      expect(supabaseMock.signOut).not.toHaveBeenCalled();
    });

    it('should not navigate when verifyEmailChange returns an error', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      supabaseMock.verifyEmailChange.mockResolvedValue({
        data: { session: null },
        error: { message: 'invalid otp' },
      });

      await component.onSubmit(buildForm('000000'));

      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('should not call supabase.verifyEmailChange when form is invalid', async () => {
      await component.onSubmit(buildForm('', false));
      expect(supabaseMock.verifyEmailChange).not.toHaveBeenCalled();
    });

    it('should clear errorMessage before attempting verification', async () => {
      supabaseMock.verifyEmailChange.mockResolvedValue({
        data: { session: null },
        error: { message: 'fail' },
      });
      await component.onSubmit(buildForm('000000'));
      expect(component.errorMessage()).toBe(
        'Invalid or expired code. Please try again.',
      );

      supabaseMock.verifyEmailChange.mockResolvedValue({
        data: { session: {} },
        error: null,
      });
      await component.onSubmit(buildForm('123456'));
      expect(component.errorMessage()).toBe('');
    });
  });

  describe('when no pending email change', () => {
    beforeEach(async () => {
      supabaseMock = createSupabaseMock(null);

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [VerifyEmailChange],
        providers: [
          provideRouter([]),
          { provide: Supabase, useValue: supabaseMock },
        ],
      }).compileComponents();
    });

    it('should compute isEmailChangePending as false', () => {
      const localFixture = TestBed.createComponent(VerifyEmailChange);
      expect(localFixture.componentInstance.isEmailChangePending()).toBe(
        false,
      );
    });

    it('should navigate to /settings on init', () => {
      const localFixture = TestBed.createComponent(VerifyEmailChange);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      localFixture.componentInstance.ngOnInit();
      expect(navigateSpy).toHaveBeenCalledWith(['/settings']);
    });
  });
});
