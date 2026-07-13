import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type { LimitedFeature, UserProfile } from '@opticv/datatypes';
import { Supabase } from '../../core/auth/services/supabase';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { catchError, EMPTY, tap } from 'rxjs';
import posthog from 'posthog-js';

@Component({
  selector: 'app-settings',
  imports: [
    AvatarModule,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    DatePipe,
  ],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class Settings implements OnInit {
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);

  readonly userProfile = this.userSettingsApiService.userProfile;
  readonly usageStatus = this.userSettingsApiService.usageStatus;
  readonly isDeleting = signal(false);

  private readonly featureLabels: Record<LimitedFeature, string> = {
    CV_OPTIMIZATION: 'CV optimization runs',
    COVER_LETTER: 'Cover letter generations',
    INTERVIEW_PREP: 'Interview prep generations',
    LINKEDIN: 'LinkedIn content generations',
  };

  ngOnInit() {
    this.userSettingsApiService.reloadUserProfile();
    this.userSettingsApiService.reloadUsageStatus();
  }

  featureLabel(feature: LimitedFeature): string {
    return this.featureLabels[feature];
  }

  onDeleteAccount(): void {
    this.confirmationService.confirm({
      message:
        'This will permanently delete your account and all associated data. This action cannot be undone.',
      header: 'Delete account',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.isDeleting.set(true);
        this.userSettingsApiService
          .deleteAccount()
          .pipe(
            catchError((err) => {
              const message =
                err?.error?.message ??
                'Failed to delete account. Please try again.';
              this.messageService.add({
                severity: 'error',
                summary: 'Delete failed',
                detail: message,
              });
              this.isDeleting.set(false);
              posthog.capture('account_deleted', {
                page: 'settings',
                button_name: 'Delete account',
              });
              return EMPTY;
            }),
            tap(async () => {
              await this.supabase.signOut();
              this.router.navigate(['/login']);
            }),
          )
          .subscribe();
      },
    });
  }

  getAvatarLabel(profile: UserProfile | null): string {
    if (!profile) return 'U';
    const source = profile.displayName ?? profile.email;
    return source.charAt(0).toUpperCase();
  }
}
