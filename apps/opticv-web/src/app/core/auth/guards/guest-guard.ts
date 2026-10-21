import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { getSafeReturnUrl, RETURN_URL_PARAM } from '../utils/return-url';

export const guestGuard: CanActivateFn = (route) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const supabase = inject(Supabase);
  const router = inject(Router);
  return supabase.getSession().then(({ data }) => {
    if (!data.session) {
      return true;
    } else {
      const returnUrl = getSafeReturnUrl(
        route.queryParamMap.get(RETURN_URL_PARAM),
      );
      return returnUrl
        ? router.parseUrl(returnUrl)
        : router.createUrlTree(['/']);
    }
  });
};
