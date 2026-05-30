import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Login } from './login';
import { Supabase } from '../../services/supabase';

@Component({ template: '', standalone: true })
class VerifyStub {}

function createSupabaseMock(otpResult: { data: any; error: any } = { data: {}, error: null }) {
  return {
    signInWithOtp: vi.fn().mockResolvedValue(otpResult),
    setPendingEmail: vi.fn(),
  };
}

function createMessageServiceMock() {
  return { add: vi.fn() };
}

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let supabaseMock: ReturnType<typeof createSupabaseMock>;
  let messageServiceMock: ReturnType<typeof createMessageServiceMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    supabaseMock = createSupabaseMock();
    messageServiceMock = createMessageServiceMock();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: 'verify', component: VerifyStub }]),
        { provide: Supabase, useValue: supabaseMock },
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize email to empty string', () => {
    expect(component.email).toBe('');
  });

  it('should initialize errorMessage signal to empty string', () => {
    expect(component.errorMessage()).toBe('');
  });

  it('should render the sign in heading', () => {
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('Sign in to the app');
  });

  it('should render the email input', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="email"]');
    expect(input).not.toBeNull();
  });

  it('should render the submit button', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button).not.toBeNull();
  });

  describe('onSubmit()', () => {
    function buildForm(email: string, valid = true) {
      return {
        valid,
        form: { value: { email } },
      } as any;
    }

    it('should call supabase.signInWithOtp with the submitted email on valid form', async () => {
      await component.onSubmit(buildForm('user@example.com'));
      expect(supabaseMock.signInWithOtp).toHaveBeenCalledWith('user@example.com');
    });

    it('should show success toast and set pending email when OTP succeeds', async () => {
      await component.onSubmit(buildForm('user@example.com'));
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
      expect(supabaseMock.setPendingEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should navigate to /verify when OTP succeeds', async () => {
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate');
      await component.onSubmit(buildForm('user@example.com'));
      expect(navigateSpy).toHaveBeenCalledWith(['/verify']);
    });

    it('should set errorMessage when OTP returns an error', async () => {
      supabaseMock.signInWithOtp.mockResolvedValue({ data: null, error: { message: 'fail' } });
      await component.onSubmit(buildForm('user@example.com'));
      expect(component.errorMessage()).toBe('Error during sign in process');
    });

    it('should not call supabase.signInWithOtp when form is invalid', async () => {
      await component.onSubmit(buildForm('', false));
      expect(supabaseMock.signInWithOtp).not.toHaveBeenCalled();
    });

    it('should clear errorMessage before attempting sign in', async () => {
      supabaseMock.signInWithOtp.mockResolvedValue({ data: null, error: { message: 'fail' } });
      await component.onSubmit(buildForm('user@example.com'));
      expect(component.errorMessage()).toBe('Error during sign in process');

      supabaseMock.signInWithOtp.mockResolvedValue({ data: {}, error: null });
      await component.onSubmit(buildForm('user@example.com'));
      expect(component.errorMessage()).toBe('');
    });
  });
});
