import { Route } from '@angular/router';
import { guestGuard } from './core/auth/guards/guest-guard';
import { authGuard } from './core/auth/guards/auth-guard';

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
    path: 'upload-cv',
    loadComponent: () =>
      import('./features/upload-cv/upload-cv').then((c) => c.UploadCv),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((c) => c.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'cv-optimization',
    loadComponent: () =>
      import('./features/cv-optimization/cv-optimization').then(
        (m) => m.CvOptimization,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings').then((c) => c.Settings),
    canActivate: [authGuard],
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
