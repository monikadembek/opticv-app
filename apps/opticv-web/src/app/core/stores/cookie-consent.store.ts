import { computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

const STORAGE_KEY = 'opticv_cookie_consent';

export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentStatus = 'accepted' | 'rejected';

interface CookieConsentRecord {
  status: CookieConsentStatus;
  version: number;
  decidedAt: string;
}

export interface CookieConsentState {
  status: CookieConsentStatus | null;
  isBannerReopened: boolean;
}

const initialState: CookieConsentState = {
  status: null,
  isBannerReopened: false,
};

function isCookieConsentRecord(value: unknown): value is CookieConsentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    (record['status'] === 'accepted' || record['status'] === 'rejected') &&
    record['version'] === COOKIE_CONSENT_VERSION &&
    typeof record['decidedAt'] === 'string'
  );
}

function readConsent(platformId: object): CookieConsentStatus | null {
  if (!isPlatformBrowser(platformId)) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCookieConsentRecord(parsed) ? parsed.status : null;
  } catch {
    return null;
  }
}

function writeConsent(platformId: object, status: CookieConsentStatus): void {
  if (!isPlatformBrowser(platformId)) return;

  const record: CookieConsentRecord = {
    status,
    version: COOKIE_CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    return;
  }
}

export const CookieConsentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isBannerVisible: computed(
      () => store.status() === null || store.isBannerReopened(),
    ),
    hasAcceptedAnalytics: computed(() => store.status() === 'accepted'),
  })),
  withMethods((store, platformId = inject(PLATFORM_ID)) => ({
    accept(): void {
      writeConsent(platformId, 'accepted');
      patchState(store, { status: 'accepted', isBannerReopened: false });
    },
    reject(): void {
      writeConsent(platformId, 'rejected');
      patchState(store, { status: 'rejected', isBannerReopened: false });
    },
    reopenBanner(): void {
      patchState(store, { isBannerReopened: true });
    },
  })),
  withHooks({
    onInit(store, platformId = inject(PLATFORM_ID)) {
      patchState(store, { status: readConsent(platformId) });
    },
  }),
);
