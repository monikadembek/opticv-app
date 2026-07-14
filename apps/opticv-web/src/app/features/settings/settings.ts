import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  form,
  FormField,
  maxLength,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
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
    ProgressBarModule,
    ProgressSpinnerModule,
    ToggleSwitchModule,
    InputTextModule,
    FormsModule,
    FormField,
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
  readonly isSavingName = signal(false);
  readonly nameSubmitted = signal(false);
  readonly productUpdatesEnabled = signal(true);
  readonly weeklyTipsEnabled = signal(false);

  readonly fullNameModel = signal({ displayName: '' });
  readonly fullNameForm = form(this.fullNameModel, (path) => {
    required(path.displayName, { message: 'Full name is required.' });
    maxLength(path.displayName, 100, {
      message: 'Full name can contain maximum  100 characters.',
    });
    minLength(path.displayName, 2, {
      message: 'Name must be at least 2 characters long',
    });
  });

  private readonly featureLabels: Record<LimitedFeature, string> = {
    CV_OPTIMIZATION: 'CV optimization runs',
    COVER_LETTER: 'Cover letter generations',
    INTERVIEW_PREP: 'Interview prep generations',
    LINKEDIN: 'LinkedIn content generations',
  };

  constructor() {
    effect(() => {
      const profile = this.userProfile.value();
      if (profile) {
        this.fullNameModel.set({ displayName: profile.displayName ?? '' });
      }
    });
  }

  ngOnInit() {
    this.userSettingsApiService.reloadUserProfile();
    this.userSettingsApiService.reloadUsageStatus();
  }

  featureLabel(feature: LimitedFeature): string {
    return this.featureLabels[feature];
  }

  usagePercent(used: number, limit: number): number {
    return limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
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

  onSubmit(event: Event): void {
    event.preventDefault();

    this.nameSubmitted.set(true);

    const displayName = this.fullNameForm.displayName().value().trim();

    if (this.fullNameForm().invalid() || !this.fullNameForm().dirty()) {
      return;
    }

    this.isSavingName.set(true);

    this.userSettingsApiService
      .updateDisplayName(displayName)
      .pipe(
        catchError((err) => {
          const message =
            (err as { error?: { message?: string } })?.error?.message ??
            'Failed to update full name. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Update Error',
            detail: message,
          });
          this.isSavingName.set(false);
          return EMPTY;
        }),
      )
      .subscribe((res) => {
        console.log('Update name Result: ', res);
        this.isSavingName.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Full name updated.',
        });
        this.userSettingsApiService.reloadUserProfile();
      });
  }

  getAvatarLabel(profile: UserProfile | null): string {
    if (!profile) return 'U';
    const source = profile.displayName ?? profile.email;
    return source.charAt(0).toUpperCase();
  }
}
