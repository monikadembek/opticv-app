import { Component, effect, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-top-header',
  imports: [AvatarModule, MenubarModule, ButtonModule, RouterLink],
  templateUrl: './top-header.html',
  styleUrl: './top-header.css',
})
export class TopHeader {
  private readonly router = inject(Router);

  isLoggedIn = input<boolean>(false);
  userLabel = input('U');
  signOut = output<void>();

  items: MenuItem[] = [
    {
      label: 'Home',
      route: '/',
    },
  ];

  constructor() {
    effect(() => {
      const loggedInMenuItems: MenuItem[] = [
        {
          label: 'Upload CV',
          route: '/upload-cv',
        },
      ];
      if (this.isLoggedIn()) {
        this.items = [...this.items, ...loggedInMenuItems];
      }
    });
  }

  navigateToLoginPage(): void {
    this.router.navigate(['/login']);
  }

  emitSignOut() {
    this.signOut.emit();
  }
}
