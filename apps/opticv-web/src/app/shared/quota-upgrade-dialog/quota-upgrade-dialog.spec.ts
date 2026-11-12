import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import posthog from 'posthog-js';
import type { QuotaErrorPayload } from '@opticv/datatypes';
import { QuotaUpgradeDialog } from './quota-upgrade-dialog';
import { QuotaDialogStore } from '../../core/stores/quota-dialog.store';
import { PlanUsageStore } from '../../core/stores/plan-usage.store';

const quotaExceeded = (overrides: {
  resetsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
}): QuotaErrorPayload => ({
  code: 'QUOTA_EXCEEDED',
  feature: 'CV_OPTIMIZATION',
  limit: 1,
  resetsAt: null,
  cancelAtPeriodEnd: false,
  ...overrides,
});

const featureNotAvailable: QuotaErrorPayload = {
  code: 'FEATURE_NOT_AVAILABLE',
  feature: 'LINKEDIN',
  limit: 0,
  resetsAt: null,
  cancelAtPeriodEnd: false,
};

const cvLimit: QuotaErrorPayload = { code: 'CV_LIMIT_EXCEEDED', limit: 5 };

describe('QuotaUpgradeDialog', () => {
  let fixture: ComponentFixture<QuotaUpgradeDialog>;
  let component: QuotaUpgradeDialog;
  let store: InstanceType<typeof QuotaDialogStore>;
  let canUpgrade: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    canUpgrade = signal(true);

    await TestBed.configureTestingModule({
      imports: [QuotaUpgradeDialog],
      providers: [
        provideRouter([]),
        { provide: PlanUsageStore, useValue: { canUpgrade } },
      ],
    }).compileComponents();

    store = TestBed.inject(QuotaDialogStore);
    fixture = TestBed.createComponent(QuotaUpgradeDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('has no content while closed', () => {
    expect(component.content()).toBeNull();
  });

  describe('QUOTA_EXCEEDED', () => {
    it('explains the reset date and offers an upgrade', () => {
      store.open(quotaExceeded({ resetsAt: '2026-12-01T12:00:00.000Z' }));

      const content = component.content();
      expect(content?.header).toBe('Limit reached');
      expect(content?.message).toContain('CV optimization runs');
      expect(content?.message).toContain('Resets Dec 1, 2026');
      expect(content?.message).toContain('Upgrade your plan');
      expect(content?.showUpgrade).toBe(true);
    });

    it("explains that the plan won't renew when canceled at period end", () => {
      store.open(
        quotaExceeded({
          resetsAt: '2026-12-01T12:00:00.000Z',
          cancelAtPeriodEnd: true,
        }),
      );

      const message = component.content()?.message;
      expect(message).toContain("won't renew");
      expect(message).toContain('Access ends Dec 1, 2026');
    });

    it('omits the date when resetsAt is null', () => {
      store.open(quotaExceeded({ resetsAt: null }));

      const message = component.content()?.message;
      expect(message).not.toContain('Resets');
      expect(message).toContain('Upgrade your plan');
    });

    it('offers no upgrade on PRO', () => {
      canUpgrade.set(false);
      store.open(quotaExceeded({ resetsAt: '2026-12-01T12:00:00.000Z' }));

      const content = component.content();
      expect(content?.message).toContain('Resets');
      expect(content?.message).not.toContain('Upgrade');
      expect(content?.showUpgrade).toBe(false);
    });
  });

  describe('FEATURE_NOT_AVAILABLE', () => {
    it('explains the feature is not on the plan and offers an upgrade', () => {
      store.open(featureNotAvailable);

      const content = component.content();
      expect(content?.header).toBe('Not available on your plan');
      expect(content?.message).toContain('LinkedIn content generations');
      expect(content?.message).toContain('Upgrade to unlock them.');
      expect(content?.showUpgrade).toBe(true);
    });

    it('offers no upgrade on PRO', () => {
      canUpgrade.set(false);
      store.open(featureNotAvailable);

      expect(component.content()?.message).not.toContain('Upgrade');
      expect(component.content()?.showUpgrade).toBe(false);
    });
  });

  describe('CV_LIMIT_EXCEEDED', () => {
    it('explains the CV limit and offers an upgrade', () => {
      store.open(cvLimit);

      const content = component.content();
      expect(content?.header).toBe('CV storage limit reached');
      expect(content?.message).toBe(
        'You can store up to 5 CVs on your plan. Delete one or upgrade to add more.',
      );
      expect(content?.showUpgrade).toBe(true);
    });

    it('only suggests deleting a CV on PRO', () => {
      canUpgrade.set(false);
      store.open(cvLimit);

      expect(component.content()?.message).toBe(
        'You can store up to 5 CVs on your plan. Delete one to add more.',
      );
      expect(component.content()?.showUpgrade).toBe(false);
    });
  });

  it('onViewPlans tracks the click, closes the dialog and navigates to pricing', () => {
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const captureSpy = vi.spyOn(posthog, 'capture');
    store.open(cvLimit);

    component.onViewPlans();

    expect(captureSpy).toHaveBeenCalledWith('upgrade_cta_clicked', {
      page: '/',
      place: 'quota_dialog',
    });
    expect(store.isOpen()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/pricing']);
  });

  it('close closes the dialog', () => {
    store.open(cvLimit);
    component.close();
    expect(store.isOpen()).toBe(false);
  });

  it('closes the dialog when it is hidden', () => {
    store.open(cvLimit);
    component.onVisibleChange(false);
    expect(store.isOpen()).toBe(false);
  });

  it('keeps the dialog open when visibility is set to true', () => {
    store.open(cvLimit);
    component.onVisibleChange(true);
    expect(store.isOpen()).toBe(true);
  });
});
