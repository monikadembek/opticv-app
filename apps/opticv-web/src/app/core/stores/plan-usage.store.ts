import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods } from '@ngrx/signals';
import { getEffectiveTier } from '@opticv/datatypes';
import type { QuotaStatus, SubscriptionTier } from '@opticv/datatypes';
import { UserSettingsApiService } from '../services/user-settings-api.service';

export const PlanUsageStore = signalStore(
  { providedIn: 'root' },
  withComputed((_store, api = inject(UserSettingsApiService)) => {
    const storedCvs = computed(
      () => api.usageStatus.value()?.storedCvs ?? null,
    );
    const effectiveTier = computed<SubscriptionTier | null>(() => {
      const subscription = api.userProfile.value()?.subscription;
      return subscription
        ? getEffectiveTier(subscription.tier, subscription.status)
        : null;
    });

    return {
      effectiveTier,
      canUpgrade: computed(() => effectiveTier() !== 'PRO'),
      resetLabel: computed(() =>
        api.userProfile.value()?.subscription?.cancelAtPeriodEnd
          ? 'Access ends'
          : 'Resets',
      ),
      optimizationQuota: computed<QuotaStatus | null>(
        () =>
          api.usageStatus
            .value()
            ?.quotas.find((quota) => quota.feature === 'CV_OPTIMIZATION') ??
          null,
      ),
      storedCvs,
      isAtCvLimit: computed(() => {
        const cvs = storedCvs();
        return cvs !== null && cvs.used >= cvs.limit;
      }),
    };
  }),
  withMethods((_store, api = inject(UserSettingsApiService)) => ({
    reload(): void {
      api.reloadUsageStatus();
    },
  })),
);
