import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Supabase } from '../services/supabase';
import { environment } from '../../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(Supabase);
  const token = supabase.currentSession()?.access_token;

  if (token) {
    const reqWithHeader = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    if (!environment.production) {
      console.log('reqWithHeader: ', reqWithHeader);
    }
    return next(reqWithHeader);
  }

  return next(req);
};
