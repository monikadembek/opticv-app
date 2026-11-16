import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import posthog from 'posthog-js';
import { SubscriptionTier } from '@opticv/datatypes';
import { UserGuideStore } from '../../core/stores/user-guide.store';
import { UserSettingsApiService } from '../../core/services/user-settings-api.service';
import { BillingRedirectService } from '../../core/services/billing-redirect.service';
import { PlanUsageStore } from '../../core/stores/plan-usage.store';

const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
};

const TIER_BADGE_CLASSES: Record<SubscriptionTier, string> = {
  FREE: 'bg-slate-100 text-slate-700',
  BASIC: 'bg-sky-100 text-sky-800',
  PRO: 'bg-amber-100 text-amber-800',
};

@Component({
  selector: 'app-top-header',
  imports: [
    AvatarModule,
    MenubarModule,
    MenuModule,
    ButtonModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './top-header.html',
  styleUrl: './top-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopHeader {
  private readonly router = inject(Router);
  private readonly userGuideStore = inject(UserGuideStore);
  private readonly userSettingsApiService = inject(UserSettingsApiService);
  private readonly billingRedirectService = inject(BillingRedirectService);
  private readonly planUsageStore = inject(PlanUsageStore);

  private readonly userMenu = viewChild<Menu>('userMenu');

  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();

  /** Bound to p-menu's `id` input, which PrimeNG applies to the rendered popup overlay. */
  readonly userMenuId = 'user-menu';
  readonly isUserMenuOpen = signal(false);

  private readonly tier = computed(
    () => this.userSettingsApiService.userProfile.value()?.subscription?.tier,
  );

  readonly badgeTier = computed(() => this.planUsageStore.effectiveTier());

  readonly badgeLabel = computed(() => {
    const tier = this.badgeTier();
    return tier ? TIER_LABELS[tier] : null;
  });

  readonly badgeClass = computed(() => {
    const tier = this.badgeTier();
    return tier ? TIER_BADGE_CLASSES[tier] : '';
  });

  readonly avatarButtonAriaLabel = computed(() => {
    const label = this.badgeLabel();
    return label ? `Open user menu, ${label} plan` : 'Open user menu';
  });

  readonly userMenuItems = computed<MenuItem[]>(() => {
    const tier = this.tier();
    const isPaid = tier === 'BASIC' || tier === 'PRO';
    const billingLabel = tier
      ? `Plan & Billing · ${TIER_LABELS[tier]} Plan`
      : 'Plan & Billing';

    return [
      {
        label: billingLabel,
        items: [
          {
            label: isPaid ? 'Manage subscription' : 'Upgrade',
            command: () => this.openPlanAndBilling(isPaid),
            icon: 'pi pi-credit-card',
            disabled:
              !tier ||
              (isPaid && this.billingRedirectService.redirectingToPortal()),
          },
        ],
      },
      { separator: true },
      {
        label: 'Profile',
        items: [
          {
            label: 'Account Settings',
            icon: 'pi pi-user',
            command: () => this.openAccountSettings(),
          },
          {
            label: 'Sign Out',
            icon: 'pi pi-power-off',
            command: () => this.emitSignOut(),
          },
        ],
      },
    ];
  });

  items: MenuItem[] = [
    {
      label: 'Home',
      route: '/home',
    },
  ];

  constructor() {
    // p-menu is destroyed on sign-out and onHide may not fire, so reset here.
    effect(() => {
      if (!this.isLoggedIn()) {
        this.isUserMenuOpen.set(false);
      }
    });

    effect(() => {
      const loggedInMenuItems: MenuItem[] = [
        {
          label: 'Dashboard',
          route: '/dashboard',
        },
        {
          label: 'Upload CV',
          route: '/upload-cv',
        },
        {
          label: 'Optimize CV',
          route: '/cv-optimization',
        },
        {
          label: 'Pricing',
          route: '/pricing',
        },
      ];
      if (this.isLoggedIn()) {
        this.items = [
          {
            label: 'Home',
            route: '/home',
          },
          ...loggedInMenuItems,
        ];
      } else {
        this.items = [
          {
            label: 'Home',
            route: '/home',
          },
          {
            label: 'Pricing',
            route: '/pricing',
          },
        ];
      }
    });
  }

  navigateToLoginPage(): void {
    this.router.navigate(['/login']);
    posthog.capture('signin_button_clicked', {
      place: 'top header',
      button_title: 'Sign In',
    });
  }

  toggleUserMenu(event: Event): void {
    this.userMenu()?.toggle(event);
  }

  private openAccountSettings(): void {
    this.router.navigate(['/settings']);
  }

  private openPlanAndBilling(isPaid: boolean): void {
    if (isPaid) {
      this.billingRedirectService.openPortal();
    } else {
      this.router.navigate(['/pricing']);
    }
  }

  emitSignOut() {
    this.signOut.emit();
    posthog.capture('signout_button_clicked', {
      place: 'user menu',
      button_title: 'Sign Out',
    });
  }

  openHelp(): void {
    this.userGuideStore.openWelcomeModal('tour');
    posthog.capture('help_icon_clicked', {
      place: 'top header',
      button_title: 'Help',
    });
  }
}
