import { Route } from '@angular/router';
import { guestGuard } from './core/auth/guards/guest-guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/pages/login/login').then((c) => c.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'verify',
    loadComponent: () =>
      import('./core/auth/pages/verify/verify').then((c) => c.Verify),
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home').then((c) => c.Home),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
