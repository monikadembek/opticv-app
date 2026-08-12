import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type {
  LimitedFeature,
  NotificationType,
  UserProfile,
} from '@opticv/datatypes';
import { Supabase } from '../../core/auth/services/supabase';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { catchError, EMPTY, tap } from 'rxjs';
import posthog from 'posthog-js';
import { CvStore } from '../../core/stores/cv.store';

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
  styles: `
    .hide-invalid-style.p-invalid {
      border-color: var(--p-inputtext-border-color) !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class Settings implements OnInit {
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cvStore = inject(CvStore);

  readonly userProfile = this.userSettingsApiService.userProfile;
  readonly usageStatus = this.userSettingsApiService.usageStatus;
  readonly isDeleting = signal(false);
  readonly isSavingName = signal(false);
  readonly nameSubmitted = signal(false);
  readonly isChangingEmail = signal(false);
  readonly newEmailSubmitted = signal(false);
  readonly emailChangePendingFor = signal<string | null>(null);
  readonly productUpdatesEnabled = signal(true);
  readonly weeklyTipsEnabled = signal(false);
  readonly isRedirectingToCheckout = signal<'BASIC' | 'PRO' | null>(null);
  readonly isRedirectingToPortal = signal(false);

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

  readonly newEmailModel = signal({ newEmail: '' });
  readonly newEmailForm = form(this.newEmailModel, (path) => {
    required(path.newEmail, { message: 'New email is required.' });
    email(path.newEmail, { message: 'Enter a valid email address.' });
    validate(path.newEmail, (ctx) => {
      const currentEmail = this.userProfile.value()?.email;
      if (currentEmail && ctx.value() === currentEmail) {
        return {
          kind: 'sameEmail',
          message: 'New email must be different from your current email.',
        };
      }
      return undefined;
    });
  });

  private readonly featureLabels: Record<LimitedFeature, string> = {
    CV_OPTIMIZATION: 'CV optimization runs',
    COVER_LETTER: 'Cover letter generations',
    INTERVIEW_PREP: 'Interview prep generations',
    LINKEDIN: 'LinkedIn content generations',
  };

  readonly subscriptionRenewal = computed<{
    tier: string;
    verb: string;
    date: string;
  } | null>(() => {
    const subscription = this.userProfile.value()?.subscription;
    if (!subscription || !subscription.currentPeriodEnd) {
      return null;
    }

    const verb = subscription.cancelAtPeriodEnd ? 'will end on' : 'renews on';

    return {
      tier: subscription.tier,
      verb,
      date: subscription.currentPeriodEnd,
    };
  });

  constructor() {
    effect(() => {
      const profile = this.userProfile.value();
      if (profile) {
        this.fullNameModel.set({ displayName: profile.displayName ?? '' });
        this.newEmailModel.set({ newEmail: profile.email ?? '' });
        this.productUpdatesEnabled.set(
          profile.notifications.productUpdatesEnabled,
        );
        this.weeklyTipsEnabled.set(profile.notifications.weeklyTipsEnabled);
      }
    });
  }

  ngOnInit() {
    this.userSettingsApiService.reloadUserProfile();
    this.userSettingsApiService.reloadUsageStatus();

    const billing = this.route.snapshot.queryParamMap.get('billing');
    if (billing === 'success') {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Subscription updated.',
      });
    } else if (billing === 'canceled') {
      this.messageService.add({
        severity: 'info',
        summary: 'Checkout canceled',
        detail: 'Checkout canceled.',
      });
    }
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
              this.cvStore.resetStore();
              this.router.navigate(['/login']);
            }),
          )
          .subscribe();
      },
    });
  }

  onFullNameUpdateSubmit(event: Event): void {
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
      .subscribe(() => {
        this.isSavingName.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Full name updated.',
        });
        this.userSettingsApiService.reloadUserProfile();
      });
  }

  onNotificationToggle(type: NotificationType, enabled: boolean): void {
    const preference =
      type === 'PRODUCT_UPDATES'
        ? this.productUpdatesEnabled
        : this.weeklyTipsEnabled;
    const previousValue = !enabled;

    preference.set(enabled);

    this.userSettingsApiService
      .updateNotificationPreference(type, enabled)
      .pipe(
        catchError((err) => {
          const message =
            (err as { error?: { message?: string } })?.error?.message ??
            'Failed to update notification preference. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Preference Update Error',
            detail: message,
          });
          preference.set(previousValue);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  onChangeEmailSubmit(event: Event): void {
    event.preventDefault();
    this.newEmailSubmitted.set(true);

    const newEmail = this.newEmailForm.newEmail().value().trim();

    if (this.newEmailForm().invalid()) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Change email',
      message: `We'll send a confirmation link to ${newEmail}. Click the link in that email to complete the change.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Send link',
      rejectLabel: 'Cancel',
      accept: async () => {
        posthog.capture('email_change_requested', { page: 'settings' });
        this.isChangingEmail.set(true);

        const { error } = await this.supabase.updateEmail(newEmail);

        this.isChangingEmail.set(false);

        if (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.message ??
              'Failed to start email change process. Please try again.',
          });
          return;
        }

        this.emailChangePendingFor.set(newEmail);
      },
    });
  }

  onUpgrade(tier: 'BASIC' | 'PRO'): void {
    this.isRedirectingToCheckout.set(tier);

    this.userSettingsApiService
      .createCheckoutSession(tier)
      .pipe(
        catchError((err) => {
          const message =
            (err as { error?: { message?: string } })?.error?.message ??
            'Failed to start checkout. Please try again.';
          this.messageService.add({
            severity: 'error',
            summary: 'Checkout Error',
            detail: message,
          });
          this.isRedirectingToCheckout.set(null);
          return EMPTY;
        }),
      )
      .subscribe((response) => {
        window.location.href = response.url;
      });
  }

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

  getAvatarLabel(profile: UserProfile | null): string {
    if (!profile) return 'U';
    const source = profile.displayName ?? profile.email;
    return source.charAt(0).toUpperCase();
  }
}
