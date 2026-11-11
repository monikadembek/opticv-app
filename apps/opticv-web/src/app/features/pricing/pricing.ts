import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TIER_LIMITS } from '@opticv/datatypes';
import type { SubscriptionTier } from '@opticv/datatypes';
import { Supabase } from '../../core/auth/services/supabase';
import { RETURN_URL_PARAM } from '../../core/auth/utils/return-url';
import {
  BillingRedirectService,
  PaidTier,
} from '../../core/services/billing-redirect.service';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { INCLUDED_FEATURES, PLANS, PlanDescriptor } from './pricing.constants';

type ViewerState = 'loading' | 'guest' | 'error' | 'free' | 'paid';
type CtaAction = 'login' | 'checkout' | 'portal' | 'none';

type PlanCta = {
  label: string;
  ariaLabel: string;
  action: CtaAction;
  disabled: boolean;
  loading: boolean;
};

type PlanCard = {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  price: string;
  isCurrent: boolean;
  quotas: string[];
  cta: PlanCta | null;
};

const PAID_STATUSES = ['ACTIVE', 'TRIALING', 'PAST_DUE'];

function count(value: number, singular: string): string {
  return `${value} ${singular}${value === 1 ? '' : 's'}`;
}

function isPaidTier(tier: SubscriptionTier): tier is PaidTier {
  return tier !== 'FREE';
}

@Component({
  selector: 'app-pricing',
  imports: [ButtonModule],
  templateUrl: './pricing.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pricing implements OnInit {
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly billingRedirectService = inject(BillingRedirectService);

  readonly includedFeatures = INCLUDED_FEATURES;

  private readonly subscription = computed(
    () => this.userSettingsApiService.userProfile.value()?.subscription ?? null,
  );

  readonly viewerState = computed<ViewerState>(() => {
    if (!this.supabase.sessionReady()) {
      return 'loading';
    }
    if (!this.supabase.currentUser()) {
      return 'guest';
    }

    const profile = this.userSettingsApiService.userProfile;
    if (profile.error()) {
      return 'error';
    }
    if (!profile.hasValue() || !profile.value()) {
      return 'loading';
    }

    const subscription = this.subscription();
    return subscription &&
      subscription.tier !== 'FREE' &&
      PAID_STATUSES.includes(subscription.status)
      ? 'paid'
      : 'free';
  });

  readonly plans = computed<PlanCard[]>(() =>
    PLANS.map((plan) => this.toPlanCard(plan)),
  );

  ngOnInit(): void {
    if (this.supabase.currentUser()) {
      this.userSettingsApiService.reloadUserProfile();
    }
  }

  onCta(plan: PlanCard): void {
    switch (plan.cta?.action) {
      case 'login':
        this.router.navigate(['/login'], {
          queryParams: { [RETURN_URL_PARAM]: '/pricing' },
        });
        break;
      case 'checkout':
        if (isPaidTier(plan.tier)) {
          this.billingRedirectService.startCheckout(plan.tier);
        }
        break;
      case 'portal':
        this.billingRedirectService.openPortal();
        break;
      default:
        break;
    }
  }

  private toPlanCard(plan: PlanDescriptor): PlanCard {
    const currentTier = this.viewerState() === 'free' ? 'FREE' : null;
    const paidTier =
      this.viewerState() === 'paid'
        ? (this.subscription()?.tier ?? null)
        : null;

    return {
      tier: plan.tier,
      name: plan.name,
      tagline: plan.tagline,
      price:
        plan.monthlyPrice === 0 ? '$0' : `$${plan.monthlyPrice.toFixed(2)}`,
      isCurrent: plan.tier === (currentTier ?? paidTier),
      quotas: this.quotasFor(plan.tier),
      cta: this.ctaButtonFor(plan),
    };
  }

  private quotasFor(tier: SubscriptionTier): string[] {
    const limits = TIER_LIMITS[tier];
    const templates =
      limits.allowedTemplates === 'ALL'
        ? 'Multiple ATS-friendly CV templates'
        : count(limits.allowedTemplates.length, 'CV template');

    return [
      `${count(limits.maxStoredCvs, 'CV upload')} stored`,
      `${count(limits.features.CV_OPTIMIZATION, 'CV optimization')} per month`,
      `${count(limits.features.COVER_LETTER, 'cover letter')} per month`,
      `${count(limits.features.INTERVIEW_PREP, 'interview prep guide')} per month`,
      `${count(limits.features.LINKEDIN, 'LinkedIn content generation')} per month`,
      templates,
    ];
  }

  private ctaButtonFor(plan: PlanDescriptor): PlanCta | null {
    const state = this.viewerState();
    const checkoutTier = this.billingRedirectService.redirectingToCheckout();
    const portalBusy = this.billingRedirectService.redirectingToPortal();
    const busy = checkoutTier !== null || portalBusy;
    const isFree = plan.tier === 'FREE';

    if (state === 'loading' || state === 'error') {
      return {
        label: isFree ? 'Get started for free' : `Get ${plan.name}`,
        ariaLabel: isFree
          ? 'Get started with the Free plan'
          : `Get the ${plan.name} plan`,
        action: 'none',
        disabled: true,
        loading: false,
      };
    }

    if (state === 'guest') {
      return {
        label: isFree ? 'Get started for free' : `Get ${plan.name}`,
        ariaLabel: isFree
          ? 'Get started with the Free plan'
          : `Get the ${plan.name} plan`,
        action: 'login',
        disabled: false,
        loading: false,
      };
    }

    if (state === 'free') {
      if (isFree) {
        return {
          label: 'Current plan',
          ariaLabel: 'Current plan: Free',
          action: 'none',
          disabled: true,
          loading: false,
        };
      }
      return {
        label: `Upgrade to ${plan.name}`,
        ariaLabel: `Upgrade to ${plan.name}`,
        action: 'checkout',
        disabled: busy,
        loading: checkoutTier === plan.tier,
      };
    }

    if (isFree) {
      return null;
    }
    if (plan.tier === this.subscription()?.tier) {
      return {
        label: 'Current plan',
        ariaLabel: `Current plan: ${plan.name}`,
        action: 'none',
        disabled: true,
        loading: false,
      };
    }
    return {
      label: 'Manage billing',
      ariaLabel: `Manage billing to switch to ${plan.name}`,
      action: 'portal',
      disabled: busy,
      loading: portalBusy,
    };
  }
}
