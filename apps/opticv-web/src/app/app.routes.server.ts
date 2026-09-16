import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'verify', renderMode: RenderMode.Client },
  { path: 'upload-cv', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'settings', renderMode: RenderMode.Client },
  { path: 'cv-optimization/:jobApplicationId', renderMode: RenderMode.Client },
  { path: 'cv-optimization', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
