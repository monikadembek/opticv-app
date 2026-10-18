import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  NgZone,
  PLATFORM_ID,
  effect,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import posthog from 'posthog-js';
import { environment } from '../../../environments/environment';
import { CookieConsentStore } from '../stores/cookie-consent.store';

const POSTHOG_STORAGE_PREFIX = 'ph_';
const IP_ADDRESS_PATTERN = /^[\d.]+$|:/;

@Injectable({ providedIn: 'root' })
export class PosthogService {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly cookieConsentStore = inject(CookieConsentStore);

  private isInitialized = false;
  private wasAccepted = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        if (this.cookieConsentStore.status() === 'accepted') {
          this.enableCapturing();
        } else {
          this.disableCapturing();
        }
      });
    }
  }

  private enableCapturing(): void {
    if (!this.isInitialized) {
      this.init();
      this.isInitialized = true;
    }
    if (posthog.has_opted_out_capturing()) {
      this.ngZone.runOutsideAngular(() => posthog.opt_in_capturing());
    }
    this.wasAccepted = true;
  }

  private disableCapturing(): void {
    if (!this.isInitialized) {
      this.clearLeftoverStorage();
      return;
    }
    if (this.wasAccepted) {
      // reset() also clears the stored opt-out flag, so it must run first.
      this.ngZone.runOutsideAngular(() => {
        posthog.reset();
        posthog.opt_out_capturing();
      });
      this.wasAccepted = false;
    }
  }

  private init(): void {
    this.ngZone.runOutsideAngular(() => {
      posthog.init(environment.posthogKey, {
        api_host: environment.posthogHost,
        defaults: '2026-05-30',
      });
    });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.ngZone.runOutsideAngular(() => {
          posthog.capture('$pageview', {
            $current_url: event.urlAfterRedirects,
          });
        });
      });
  }

  private clearLeftoverStorage(): void {
    const view = this.document.defaultView;
    if (!view) return;

    for (const storageName of ['localStorage', 'sessionStorage'] as const) {
      try {
        const storage = view[storageName];
        const keys = Array.from({ length: storage.length }, (_, i) =>
          storage.key(i),
        );
        for (const key of keys) {
          if (key?.startsWith(POSTHOG_STORAGE_PREFIX)) {
            storage.removeItem(key);
          }
        }
      } catch {
        continue;
      }
    }

    this.expirePosthogCookie(view.location.hostname);
  }

  private expirePosthogCookie(hostname: string): void {
    const cookieName = `${POSTHOG_STORAGE_PREFIX}${environment.posthogKey}_posthog`;
    const expired = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

    try {
      this.document.cookie = expired;

      if (hostname === 'localhost' || IP_ADDRESS_PATTERN.test(hostname)) {
        return;
      }

      const labels = hostname.split('.');
      for (let i = 0; i <= labels.length - 2; i++) {
        this.document.cookie = `${expired}; domain=${labels.slice(i).join('.')}`;
      }
    } catch {
      return;
    }
  }
}
