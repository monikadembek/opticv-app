import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CookieConsentStore } from '../../core/stores/cookie-consent.store';

@Component({
  selector: 'app-cookie-consent-banner',
  imports: [ButtonModule, RouterLink],
  templateUrl: './cookie-consent-banner.html',
  host: { class: 'sticky bottom-0 z-40 block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieConsentBanner {
  private readonly store = inject(CookieConsentStore);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  private readonly isRendered = signal(false);
  private readonly firstControl =
    viewChild<ElementRef<HTMLElement>>('firstControl');
  private opener: HTMLElement | null = null;

  readonly isVisible = computed(
    () => this.isRendered() && this.store.isBannerVisible(),
  );

  constructor() {
    afterNextRender(() => this.isRendered.set(true));

    effect(() => {
      if (!this.store.isBannerReopened()) return;

      const activeElement = this.document.activeElement;
      this.opener = activeElement instanceof HTMLElement ? activeElement : null;
      afterNextRender(() => this.firstControl()?.nativeElement.focus(), {
        injector: this.injector,
      });
    });
  }

  onAccept(): void {
    this.store.accept();
    this.restoreFocus();
  }

  onReject(): void {
    this.store.reject();
    this.restoreFocus();
  }

  private restoreFocus(): void {
    if (this.opener?.isConnected) {
      this.opener.focus();
    }
    this.opener = null;
  }
}
