import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentStore } from '../../core/stores/cookie-consent.store';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  private readonly cookieConsentStore = inject(CookieConsentStore);

  openCookieSettings(): void {
    this.cookieConsentStore.reopenBanner();
  }
}
