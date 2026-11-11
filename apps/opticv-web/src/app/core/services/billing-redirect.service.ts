import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, EMPTY } from 'rxjs';
import { UserSettingsApiService } from './user-settings-api.service';

export type PaidTier = 'BASIC' | 'PRO';

@Injectable({ providedIn: 'root' })
export class BillingRedirectService {
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly messageService = inject(MessageService);
  private readonly document = inject(DOCUMENT);

  readonly #redirectingToCheckout = signal<PaidTier | null>(null);
  readonly #redirectingToPortal = signal(false);

  readonly redirectingToCheckout = this.#redirectingToCheckout.asReadonly();
  readonly redirectingToPortal = this.#redirectingToPortal.asReadonly();

  startCheckout(tier: PaidTier): void {
    if (this.#redirectingToCheckout() !== null || this.#redirectingToPortal()) {
      return;
    }

    this.#redirectingToCheckout.set(tier);

    this.userSettingsApiService
      .createCheckoutSession(tier)
      .pipe(
        catchError((err) => {
          this.showError(
            err,
            'Checkout Error',
            'Failed to start checkout. Please try again.',
          );
          this.#redirectingToCheckout.set(null);
          return EMPTY;
        }),
      )
      .subscribe((response) => this.redirectTo(response.url));
  }

  openPortal(): void {
    if (this.#redirectingToPortal() || this.#redirectingToCheckout() !== null) {
      return;
    }

    this.#redirectingToPortal.set(true);

    this.userSettingsApiService
      .createPortalSession()
      .pipe(
        catchError((err) => {
          this.showError(
            err,
            'Billing Portal Error',
            'Failed to open billing portal. Please try again.',
          );
          this.#redirectingToPortal.set(false);
          return EMPTY;
        }),
      )
      .subscribe((response) => this.redirectTo(response.url));
  }

  private redirectTo(url: string): void {
    const location = this.document.defaultView?.location;
    if (location) {
      location.href = url;
    }
  }

  private showError(err: unknown, summary: string, fallback: string): void {
    const message =
      (err as { error?: { message?: string } })?.error?.message ?? fallback;
    this.messageService.add({ severity: 'error', summary, detail: message });
  }
}
