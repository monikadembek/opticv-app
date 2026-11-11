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

const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
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

  private readonly userMenu = viewChild<Menu>('userMenu');

  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();

  readonly isUserMenuOpen = signal(false);

  private readonly tier = computed(
    () => this.userSettingsApiService.userProfile.value()?.subscription?.tier,
  );

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

  openAccountSettings(): void {
    this.router.navigate(['/settings']);
  }

  openPlanAndBilling(isPaid: boolean): void {
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
