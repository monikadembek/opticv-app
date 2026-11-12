import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import posthog from 'posthog-js';
import type { QuotaErrorPayload } from '@opticv/datatypes';
import { QuotaDialogStore } from '../../core/stores/quota-dialog.store';
import { PlanUsageStore } from '../../core/stores/plan-usage.store';
import { FEATURE_LABELS } from '../constants';

export interface QuotaDialogContent {
  header: string;
  message: string;
  showUpgrade: boolean;
}

@Component({
  selector: 'app-quota-upgrade-dialog',
  imports: [DialogModule, ButtonModule],
  templateUrl: './quota-upgrade-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotaUpgradeDialog {
  readonly quotaDialogStore = inject(QuotaDialogStore);
  private readonly planUsageStore = inject(PlanUsageStore);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  readonly content = computed<QuotaDialogContent | null>(() => {
    const payload = this.quotaDialogStore.payload();
    return payload
      ? this.buildContent(payload, this.planUsageStore.canUpgrade())
      : null;
  });

  onVisibleChange(visible: boolean): void {
    if (!visible) {
      this.quotaDialogStore.close();
    }
  }

  onViewPlans(): void {
    posthog.capture('upgrade_cta_clicked', {
      page: this.router.url,
      place: 'quota_dialog',
    });
    this.quotaDialogStore.close();
    this.router.navigate(['/pricing']);
  }

  close(): void {
    this.quotaDialogStore.close();
  }

  private buildContent(
    payload: QuotaErrorPayload,
    canUpgrade: boolean,
  ): QuotaDialogContent {
    if (payload.code === 'CV_LIMIT_EXCEEDED') {
      return {
        header: 'CV storage limit reached',
        message: canUpgrade
          ? `You can store up to ${payload.limit} CVs on your plan. Delete one or upgrade to add more.`
          : `You can store up to ${payload.limit} CVs on your plan. Delete one to add more.`,
        showUpgrade: canUpgrade,
      };
    }

    const label = FEATURE_LABELS[payload.feature];

    if (payload.code === 'FEATURE_NOT_AVAILABLE') {
      const message = `${label} are not included in your current plan.`;
      return {
        header: 'Not available on your plan',
        message: canUpgrade ? `${message} Upgrade to unlock them.` : message,
        showUpgrade: canUpgrade,
      };
    }

    const upgradeHint = canUpgrade
      ? ' Upgrade your plan for a higher limit.'
      : '';
    let message: string;
    if (payload.cancelAtPeriodEnd && payload.resetsAt) {
      message = `${label}: you've used this period's allowance, and your plan won't renew. Access ends ${this.formatDate(payload.resetsAt)}.`;
    } else if (payload.resetsAt) {
      message = `${label}: you've used this month's allowance. Resets ${this.formatDate(payload.resetsAt)}.${upgradeHint}`;
    } else {
      message = `${label}: you've used your plan's allowance.${upgradeHint}`;
    }

    return { header: 'Limit reached', message, showUpgrade: canUpgrade };
  }

  private formatDate(iso: string): string {
    return formatDate(iso, 'mediumDate', this.locale);
  }
}
