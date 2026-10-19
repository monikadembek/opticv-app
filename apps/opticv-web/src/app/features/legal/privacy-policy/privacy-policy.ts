import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentStore } from '../../../core/stores/cookie-consent.store';

@Component({
  selector: 'app-privacy-policy',
  imports: [RouterLink],
  templateUrl: './privacy-policy.html',
  styleUrl: '../legal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicy {
  private readonly cookieConsentStore = inject(CookieConsentStore);

  openCookieSettings(): void {
    this.cookieConsentStore.reopenBanner();
  }
}
