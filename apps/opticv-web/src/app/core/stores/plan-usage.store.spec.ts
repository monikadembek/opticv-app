import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { UsageStatus, UserProfile } from '@opticv/datatypes';
import { PlanUsageStore } from './plan-usage.store';
import { UserSettingsApiService } from '../services/user-settings-api.service';

type Subscription = NonNullable<UserProfile['subscription']>;

function profileWith(subscription: Partial<Subscription> | null): UserProfile {
  return {
    id: 'user-1',
    email: 'user@example.com',
    displayName: null,
    avatarUrl: null,
    subscription: subscription
      ? {
          tier: 'FREE',
          status: 'ACTIVE',
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
          ...subscription,
        }
      : null,
    notifications: { productUpdatesEnabled: false, weeklyTipsEnabled: false },
  };
}

const usage: UsageStatus = {
  quotas: [
    {
      feature: 'CV_OPTIMIZATION',
      used: 2,
      limit: 10,
      remaining: 8,
      resetsAt: '2026-12-01T00:00:00.000Z',
    },
    {
      feature: 'COVER_LETTER',
      used: 0,
      limit: 10,
      remaining: 10,
      resetsAt: '2026-12-01T00:00:00.000Z',
    },
  ],
  storedCvs: { used: 3, limit: 5 },
};

describe('PlanUsageStore', () => {
  let profile: ReturnType<typeof signal<UserProfile | null>>;
  let usageStatus: ReturnType<typeof signal<UsageStatus | null>>;
  let reloadUsageStatus: ReturnType<typeof vi.fn>;

  function createStore() {
    return TestBed.inject(PlanUsageStore);
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    profile = signal<UserProfile | null>(null);
    usageStatus = signal<UsageStatus | null>(null);
    reloadUsageStatus = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: UserSettingsApiService,
          useValue: {
            userProfile: { value: profile },
            usageStatus: { value: usageStatus },
            reloadUsageStatus,
          },
        },
      ],
    });
  });

  describe('effectiveTier and canUpgrade', () => {
    it('is null and upgradable when the profile is not loaded', () => {
      const store = createStore();
      expect(store.effectiveTier()).toBeNull();
      expect(store.canUpgrade()).toBe(true);
    });

    it('is null and upgradable when the profile has no subscription', () => {
      profile.set(profileWith(null));
      const store = createStore();
      expect(store.effectiveTier()).toBeNull();
      expect(store.canUpgrade()).toBe(true);
    });

    it('is upgradable on FREE', () => {
      profile.set(profileWith({ tier: 'FREE' }));
      const store = createStore();
      expect(store.effectiveTier()).toBe('FREE');
      expect(store.canUpgrade()).toBe(true);
    });

    it('is not upgradable on an active PRO plan', () => {
      profile.set(profileWith({ tier: 'PRO', status: 'ACTIVE' }));
      const store = createStore();
      expect(store.effectiveTier()).toBe('PRO');
      expect(store.canUpgrade()).toBe(false);
    });

    it('falls back to FREE for a past-due BASIC plan', () => {
      profile.set(profileWith({ tier: 'BASIC', status: 'PAST_DUE' }));
      const store = createStore();
      expect(store.effectiveTier()).toBe('FREE');
      expect(store.canUpgrade()).toBe(true);
    });
  });

  describe('resetLabel', () => {
    it('is "Resets" by default', () => {
      expect(createStore().resetLabel()).toBe('Resets');
    });

    it('is "Access ends" when the plan is canceled at period end', () => {
      profile.set(profileWith({ tier: 'BASIC', cancelAtPeriodEnd: true }));
      expect(createStore().resetLabel()).toBe('Access ends');
    });
  });

  describe('usage', () => {
    it('is null while usage is not loaded', () => {
      const store = createStore();
      expect(store.optimizationQuota()).toBeNull();
      expect(store.storedCvs()).toBeNull();
      expect(store.isAtCvLimit()).toBe(false);
    });

    it('exposes the CV optimization quota and stored CVs', () => {
      usageStatus.set(usage);
      const store = createStore();
      expect(store.optimizationQuota()).toEqual(usage.quotas[0]);
      expect(store.storedCvs()).toEqual({ used: 3, limit: 5 });
      expect(store.isAtCvLimit()).toBe(false);
    });

    it('returns null when the CV optimization quota is missing', () => {
      usageStatus.set({ ...usage, quotas: [usage.quotas[1]] });
      expect(createStore().optimizationQuota()).toBeNull();
    });

    it('is at the CV limit when used equals the limit', () => {
      usageStatus.set({ ...usage, storedCvs: { used: 5, limit: 5 } });
      expect(createStore().isAtCvLimit()).toBe(true);
    });

    it('is at the CV limit when used exceeds the limit', () => {
      usageStatus.set({ ...usage, storedCvs: { used: 6, limit: 5 } });
      expect(createStore().isAtCvLimit()).toBe(true);
    });
  });

  it('reload delegates to reloadUsageStatus', () => {
    createStore().reload();
    expect(reloadUsageStatus).toHaveBeenCalledOnce();
  });
});
