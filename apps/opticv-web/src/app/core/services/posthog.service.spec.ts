import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import posthog from 'posthog-js';
import { environment } from '../../../environments/environment';
import { CookieConsentStore } from '../stores/cookie-consent.store';
import { PosthogService } from './posthog.service';

describe('PosthogService', () => {
  let optedOut: boolean;
  let initSpy: ReturnType<typeof vi.spyOn>;
  let optOutSpy: ReturnType<typeof vi.spyOn>;
  let optInSpy: ReturnType<typeof vi.spyOn>;
  let resetSpy: ReturnType<typeof vi.spyOn>;
  let captureSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    optedOut = false;

    initSpy = vi.spyOn(posthog, 'init').mockImplementation(() => posthog);
    optOutSpy = vi
      .spyOn(posthog, 'opt_out_capturing')
      .mockImplementation(() => {
        optedOut = true;
      });
    optInSpy = vi.spyOn(posthog, 'opt_in_capturing').mockImplementation(() => {
      optedOut = false;
    });
    // Real reset() also clears the stored opt-in/out consent flag.
    resetSpy = vi.spyOn(posthog, 'reset').mockImplementation(() => {
      optedOut = false;
    });
    vi.spyOn(posthog, 'has_opted_out_capturing').mockImplementation(
      () => optedOut,
    );
    captureSpy = vi
      .spyOn(posthog, 'capture')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup(platformId: 'browser' | 'server' = 'browser') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });

    const store = TestBed.inject(CookieConsentStore);
    TestBed.inject(PosthogService);
    TestBed.tick();
    return store;
  }

  function emitNavigationEnd(url: string) {
    const router = TestBed.inject(Router);
    (router.events as unknown as { next: (event: NavigationEnd) => void }).next(
      new NavigationEnd(1, url, url),
    );
  }

  it('does not initialise PostHog without a decision', () => {
    setup();

    expect(initSpy).not.toHaveBeenCalled();
  });

  it('removes leftover PostHog storage when consent is not given', () => {
    localStorage.setItem(`ph_${environment.posthogKey}_posthog`, '{}');
    localStorage.setItem('opticv_has_seen_welcome', '{}');
    sessionStorage.setItem(`ph_${environment.posthogKey}_window_id`, 'x');

    setup();

    expect(
      localStorage.getItem(`ph_${environment.posthogKey}_posthog`),
    ).toBeNull();
    expect(localStorage.getItem('opticv_has_seen_welcome')).toBe('{}');
    expect(
      sessionStorage.getItem(`ph_${environment.posthogKey}_window_id`),
    ).toBeNull();
  });

  it('does not initialise PostHog when the stored decision is rejected', () => {
    const store = setup();
    store.reject();
    TestBed.tick();

    expect(initSpy).not.toHaveBeenCalled();
    expect(optOutSpy).not.toHaveBeenCalled();
  });

  it('initialises PostHog once with the existing config after accepting', () => {
    const store = setup();

    store.accept();
    TestBed.tick();
    store.accept();
    TestBed.tick();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith(environment.posthogKey, {
      api_host: environment.posthogHost,
      defaults: '2026-05-30',
    });
  });

  it('opts out and resets when consent is revoked', () => {
    const store = setup();
    store.accept();
    TestBed.tick();

    store.reject();
    TestBed.tick();

    expect(optOutSpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('stays opted out after consent is revoked', () => {
    const store = setup();
    store.accept();
    TestBed.tick();

    store.reject();
    TestBed.tick();

    expect(resetSpy.mock.invocationCallOrder[0]).toBeLessThan(
      optOutSpy.mock.invocationCallOrder[0],
    );
    expect(posthog.has_opted_out_capturing()).toBe(true);
  });

  it('opts in after initialising when a previous opt-out was persisted', () => {
    optedOut = true;
    const store = setup();

    store.accept();
    TestBed.tick();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(optInSpy).toHaveBeenCalledTimes(1);
    expect(posthog.has_opted_out_capturing()).toBe(false);
  });

  it('opts back in without re-initialising when consent is given again', () => {
    const store = setup();
    store.accept();
    TestBed.tick();
    store.reject();
    TestBed.tick();

    store.accept();
    TestBed.tick();

    expect(optInSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('captures page views after initialisation', () => {
    const store = setup();
    store.accept();
    TestBed.tick();

    emitNavigationEnd('/dashboard');

    expect(captureSpy).toHaveBeenCalledWith('$pageview', {
      $current_url: '/dashboard',
    });
  });

  it('does not capture page views without consent', () => {
    setup();

    emitNavigationEnd('/dashboard');

    expect(captureSpy).not.toHaveBeenCalled();
  });

  it('does nothing on the server', () => {
    const store = setup('server');
    store.accept();
    TestBed.tick();

    expect(initSpy).not.toHaveBeenCalled();
    expect(optOutSpy).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });
});
