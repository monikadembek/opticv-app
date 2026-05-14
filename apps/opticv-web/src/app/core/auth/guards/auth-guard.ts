import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';

export const authGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const supabase = inject(Supabase);
  const router = inject(Router);
  return supabase.getSession().then(({ data }) => {
    if (data.session) {
      return true;
    } else {
      return router.createUrlTree(['/login']);
    }
  });
};
