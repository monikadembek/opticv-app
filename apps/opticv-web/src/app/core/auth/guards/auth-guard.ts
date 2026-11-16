import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { RETURN_URL_PARAM } from '../utils/return-url';

export const authGuard: CanActivateFn = (_route, state) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const supabase = inject(Supabase);
  const router = inject(Router);
  return supabase.getSession().then(({ data }) => {
    if (data.session) {
      return true;
    } else {
      return router.createUrlTree(['/login'], {
        queryParams: { [RETURN_URL_PARAM]: state.url },
      });
    }
  });
};
