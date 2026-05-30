import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { Verify } from './verify';
import { Supabase } from '../../services/supabase';

function createSupabaseMock(
  pendingEmail: string | null = 'user@example.com',
  otpResult: { data: { session: any }; error: any } = { data: { session: {} }, error: null },
) {
  return {
    pendingEmail: signal(pendingEmail).asReadonly(),
    verifyOtp: vi.fn().mockResolvedValue(otpResult),
    setPendingEmail: vi.fn(),
  };
}

function buildForm(code: string, valid = true) {
  return {
    valid,
    form: { value: { code } },
    resetForm: vi.fn(),
  } as any;
}

describe('Verify', () => {
  let component: Verify;
  let fixture: ComponentFixture<Verify>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    supabaseMock = createSupabaseMock();

    await TestBed.configureTestingModule({
      imports: [Verify],
      providers: [
        provideRouter([]),
        { provide: Supabase, useValue: supabaseMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Verify);
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

  it('should compute isEmailPending as true when pendingEmail is set', () => {
    expect(component.isEmailPending()).toBe(true);
  });

  it('should render the OTP verification heading', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('OTP Verification Code');
  });

  it('should render the submit button', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button).not.toBeNull();
  });

  describe('ngOnInit() — with pending email', () => {
    it('should not navigate when pending email is set', () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.ngOnInit();
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit()', () => {
    it('should call supabase.verifyOtp with the code and pending email', async () => {
      await component.onSubmit(buildForm('123456'));
      expect(supabaseMock.verifyOtp).toHaveBeenCalledWith('123456', 'user@example.com');
    });

    it('should clear pending email, reset form and navigate to home on success', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      const form = buildForm('123456');

      await component.onSubmit(form);

      expect(supabaseMock.setPendingEmail).toHaveBeenCalledWith(null);
      expect(form.resetForm).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['']);
    });

    it('should set errorMessage when verifyOtp returns an error', async () => {
      supabaseMock.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'invalid otp' } });
      await component.onSubmit(buildForm('000000'));
      expect(component.errorMessage()).toBe('Error during sign in process');
    });

    it('should not call supabase.verifyOtp when form is invalid', async () => {
      await component.onSubmit(buildForm('', false));
      expect(supabaseMock.verifyOtp).not.toHaveBeenCalled();
    });

    it('should clear errorMessage before attempting verification', async () => {
      supabaseMock.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'fail' } });
      await component.onSubmit(buildForm('000000'));
      expect(component.errorMessage()).toBe('Error during sign in process');

      supabaseMock.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
      await component.onSubmit(buildForm('123456'));
      expect(component.errorMessage()).toBe('');
    });
  });

  describe('when no pending email', () => {
    beforeEach(async () => {
      supabaseMock = createSupabaseMock(null);

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Verify],
        providers: [
          provideRouter([]),
          { provide: Supabase, useValue: supabaseMock },
        ],
      }).compileComponents();
    });

    it('should compute isEmailPending as false', () => {
      const localFixture = TestBed.createComponent(Verify);
      expect(localFixture.componentInstance.isEmailPending()).toBe(false);
    });

    it('should navigate to /login on init', () => {
      const localFixture = TestBed.createComponent(Verify);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      localFixture.componentInstance.ngOnInit();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
