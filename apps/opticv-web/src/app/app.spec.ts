import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import posthog from 'posthog-js';
import { App } from './app';
import { TopHeader } from './layout/top-header/top-header';
import { Footer } from './layout/footer/footer';
import { Supabase } from './core/auth/services/supabase';
import { ToastModule } from 'primeng/toast';
import { CvStore } from './core/stores/cv.store';
import { UserGuideStore } from './core/stores/user-guide.store';
import { WelcomeGuideModal } from './shared/welcome-guide-modal/welcome-guide-modal';

@Component({ selector: 'app-top-header', template: '', standalone: true })
class TopHeaderStub {
  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();
}

@Component({ selector: 'app-footer', template: '', standalone: true })
class FooterStub {}

@Component({ selector: 'p-toast', template: '', standalone: true })
class ToastStub {}

@Component({
  selector: 'app-welcome-guide-modal',
  template: '',
  standalone: true,
})
class WelcomeGuideModalStub {}

const mockSession = { user: { email: 'test@example.com' } } as any;

function createSupabaseMock(sessionValue: any = null, userValue: any = null) {
  const sessionSignal = signal(sessionValue);
  const userSignal = signal(userValue);
  return {
    currentSession: sessionSignal,
    currentUser: userSignal,
    signOut: vi.fn().mockResolvedValue(undefined),
    setSession: (session: any, user: any) => {
      sessionSignal.set(session);
      userSignal.set(user);
    },
  };
}

function createCvStoreMock() {
  return { loadUserCVs: vi.fn(), resetStore: vi.fn() };
}

function createUserGuideStoreMock() {
  return {
    hasSeenWelcome: vi.fn().mockReturnValue(false),
    openWelcomeModal: vi.fn(),
  };
}

describe('App', () => {
  let supabaseMock: ReturnType<typeof createSupabaseMock>;
  let cvStoreMock: ReturnType<typeof createCvStoreMock>;
  let userGuideStoreMock: ReturnType<typeof createUserGuideStoreMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    supabaseMock = createSupabaseMock();
    cvStoreMock = createCvStoreMock();
    userGuideStoreMock = createUserGuideStoreMock();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: Supabase, useValue: supabaseMock },
        { provide: CvStore, useValue: cvStoreMock },
        { provide: UserGuideStore, useValue: userGuideStoreMock },
      ],
    })
      .overrideComponent(App, {
        remove: {
          imports: [TopHeader, Footer, ToastModule, WelcomeGuideModal],
        },
        add: {
          imports: [
            TopHeaderStub,
            FooterStub,
            ToastStub,
            WelcomeGuideModalStub,
          ],
        },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialize userLabel signal to "U" when no user is logged in', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.userLabel()).toBe('U');
  });

  it('should initialize isUserLoggedIn signal to false when no session exists', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.isUserLoggedIn()).toBe(false);
  });

  it('should set isUserLoggedIn to true when a session exists', async () => {
    supabaseMock = createSupabaseMock(mockSession, mockSession.user);
    await TestBed.overrideProvider(Supabase, { useValue: supabaseMock });
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.isUserLoggedIn()).toBe(true);
  });

  it('should derive userLabel from the current user email initial', async () => {
    supabaseMock = createSupabaseMock(mockSession, mockSession.user);
    await TestBed.overrideProvider(Supabase, { useValue: supabaseMock });
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.userLabel()).toBe('T');
  });

  it('should render app-top-header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-top-header')).toBeTruthy();
  });

  it('should render main element', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('main.main')).toBeTruthy();
  });

  it('should render app-footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-footer')).toBeTruthy();
  });

  it('executeSignOut should call supabase signOut and navigate to login', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await fixture.componentInstance.executeSignOut();

    expect(supabaseMock.signOut).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['login']);
  });

  it('executeSignOut should reset the cv store', async () => {
    const fixture = TestBed.createComponent(App);

    await fixture.componentInstance.executeSignOut();

    expect(cvStoreMock.resetStore).toHaveBeenCalledOnce();
  });

  describe('cv store loading', () => {
    it('does not call loadUserCVs when the user starts out logged out', () => {
      TestBed.createComponent(App).detectChanges();
      expect(cvStoreMock.loadUserCVs).not.toHaveBeenCalled();
    });

    it('calls loadUserCVs once when the user transitions to logged in', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      supabaseMock.setSession(mockSession, mockSession.user);
      fixture.detectChanges();

      expect(cvStoreMock.loadUserCVs).toHaveBeenCalledTimes(1);
    });

    it('does not call loadUserCVs again on a subsequent re-emission while still logged in', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      supabaseMock.setSession(mockSession, mockSession.user);
      fixture.detectChanges();
      supabaseMock.setSession(mockSession, mockSession.user);
      fixture.detectChanges();

      expect(cvStoreMock.loadUserCVs).toHaveBeenCalledTimes(1);
    });

    it('calls loadUserCVs immediately when the user is already logged in on creation', () => {
      supabaseMock = createSupabaseMock(mockSession, mockSession.user);
      TestBed.overrideProvider(Supabase, { useValue: supabaseMock });
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(cvStoreMock.loadUserCVs).toHaveBeenCalledTimes(1);
    });
  });

  describe('welcome modal trigger', () => {
    it('opens the welcome modal and captures the event when the email has not been seen', () => {
      userGuideStoreMock.hasSeenWelcome.mockReturnValue(false);
      const captureSpy = vi.spyOn(posthog, 'capture');
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      supabaseMock.setSession(mockSession, mockSession.user);
      fixture.detectChanges();

      expect(userGuideStoreMock.hasSeenWelcome).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(userGuideStoreMock.openWelcomeModal).toHaveBeenCalledWith('full');
      expect(captureSpy).toHaveBeenCalledWith('welcome_modal_shown');
    });

    it('does not open the welcome modal when the email has already been seen', () => {
      userGuideStoreMock.hasSeenWelcome.mockReturnValue(true);
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      supabaseMock.setSession(mockSession, mockSession.user);
      fixture.detectChanges();

      expect(userGuideStoreMock.openWelcomeModal).not.toHaveBeenCalled();
    });

    it('does not open the welcome modal when no email is available', () => {
      const sessionWithoutEmail = { user: {} } as any;
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      supabaseMock.setSession(sessionWithoutEmail, {} as any);
      fixture.detectChanges();

      expect(userGuideStoreMock.openWelcomeModal).not.toHaveBeenCalled();
    });
  });
});
