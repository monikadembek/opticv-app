import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { TopHeader } from './layout/top-header/top-header';
import { Footer } from './layout/footer/footer';
import { Supabase } from './core/auth/services/supabase';
import { ToastModule } from 'primeng/toast';
import { CvStore } from './core/stores/cv.store';

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
  return { loadUserCVs: vi.fn() };
}

describe('App', () => {
  let supabaseMock: ReturnType<typeof createSupabaseMock>;
  let cvStoreMock: ReturnType<typeof createCvStoreMock>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    supabaseMock = createSupabaseMock();
    cvStoreMock = createCvStoreMock();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: Supabase, useValue: supabaseMock },
        { provide: CvStore, useValue: cvStoreMock },
      ],
    })
      .overrideComponent(App, {
        remove: { imports: [TopHeader, Footer, ToastModule] },
        add: { imports: [TopHeaderStub, FooterStub, ToastStub] },
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
});
