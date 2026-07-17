import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import posthog from 'posthog-js';

@Component({
  selector: 'app-top-header',
  imports: [
    AvatarModule,
    MenubarModule,
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

  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();

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
      ];
      if (this.isLoggedIn()) {
        this.items = [
          {
            label: 'Home',
            route: '/home',
          },
          ...loggedInMenuItems,
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

  emitSignOut() {
    this.signOut.emit();
    posthog.capture('signout_button_clicked', {
      place: 'top header',
      button_title: 'Sign Out',
    });
  }
}
