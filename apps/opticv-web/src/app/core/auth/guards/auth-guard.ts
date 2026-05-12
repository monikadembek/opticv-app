import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';

export const authGuard: CanActivateFn = () => {
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
