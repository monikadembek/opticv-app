import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { catchError, EMPTY } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';

@Component({
  selector: 'app-past-due-banner',
  imports: [ButtonModule],
  templateUrl: './past-due-banner.html',
  styleUrl: './past-due-banner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PastDueBanner {
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly messageService = inject(MessageService);

  readonly dismissed = signal(false);
  readonly isRedirectingToPortal = signal(false);

  readonly visible = computed(
    () =>
      !this.dismissed() &&
      this.userSettingsApiService.userProfile.value()?.subscription?.status ===
        'PAST_DUE',
  );

  onManageBilling(): void {
    this.isRedirectingToPortal.set(true);

    this.userSettingsApiService
      .createPortalSession()
      .pipe(
        catchError((err) => {
          const message =
            (err as { error?: { message?: string } })?.error?.message ??
            'Failed to open billing portal. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Billing Portal Error',
            detail: message,
          });
          this.isRedirectingToPortal.set(false);
          return EMPTY;
        }),
      )
      .subscribe((response) => {
        window.location.href = response.url;
      });
  }

  onDismiss(): void {
    this.dismissed.set(true);
  }
}
