import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import {
  COOKIE_CONSENT_VERSION,
  CookieConsentStore,
} from './cookie-consent.store';

const STORAGE_KEY = 'opticv_cookie_consent';

function storeRecord(record: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

describe('CookieConsentStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup(platformId: 'browser' | 'server' = 'browser') {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platformId }],
    });

    return TestBed.inject(CookieConsentStore);
  }

  it('has no decision and shows the banner when nothing is stored', () => {
    const store = setup();

    expect(store.status()).toBeNull();
    expect(store.isBannerVisible()).toBe(true);
    expect(store.hasAcceptedAnalytics()).toBe(false);
  });

  it.each(['accepted', 'rejected'] as const)(
    'loads a valid stored "%s" decision and hides the banner',
    (status) => {
      storeRecord({
        status,
        version: COOKIE_CONSENT_VERSION,
        decidedAt: '2026-10-01T10:00:00.000Z',
      });

      const store = setup();

      expect(store.status()).toBe(status);
      expect(store.isBannerVisible()).toBe(false);
      expect(store.hasAcceptedAnalytics()).toBe(status === 'accepted');
    },
  );

  it('treats malformed JSON as no decision', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    expect(setup().status()).toBeNull();
  });

  it('treats an unknown status as no decision', () => {
    storeRecord({
      status: 'maybe',
      version: COOKIE_CONSENT_VERSION,
      decidedAt: '2026-10-01T10:00:00.000Z',
    });

    expect(setup().status()).toBeNull();
  });

  it.each([0, COOKIE_CONSENT_VERSION + 1])(
    'treats a record with version %s as no decision',
    (version) => {
      storeRecord({
        status: 'accepted',
        version,
        decidedAt: '2026-10-01T10:00:00.000Z',
      });

      expect(setup().status()).toBeNull();
    },
  );

  it('treats a throwing localStorage read as no decision', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(setup().status()).toBeNull();
  });

  it('keeps the decision in memory when saving to localStorage fails', () => {
    const store = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    store.accept();

    expect(store.status()).toBe('accepted');
    expect(store.isBannerVisible()).toBe(false);
  });

  it.each([
    ['accept', 'accepted'],
    ['reject', 'rejected'],
  ] as const)(
    '%s() persists the decision and closes a reopened banner',
    (method, status) => {
      const store = setup();
      store.reopenBanner();

      store[method]();

      expect(store.status()).toBe(status);
      expect(store.isBannerReopened()).toBe(false);
      expect(store.isBannerVisible()).toBe(false);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw ?? '{}');
      expect(saved.status).toBe(status);
      expect(saved.version).toBe(COOKIE_CONSENT_VERSION);
      expect(typeof saved.decidedAt).toBe('string');
    },
  );

  it('reopenBanner() shows the banner and keeps the current decision', () => {
    const store = setup();
    store.reject();

    store.reopenBanner();

    expect(store.isBannerVisible()).toBe(true);
    expect(store.status()).toBe('rejected');
  });

  it('does not read localStorage on the server', () => {
    storeRecord({
      status: 'accepted',
      version: COOKIE_CONSENT_VERSION,
      decidedAt: '2026-10-01T10:00:00.000Z',
    });
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    const store = setup('server');

    expect(store.status()).toBeNull();
    expect(getItemSpy).not.toHaveBeenCalled();
  });
});
