import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Supabase } from '../services/supabase';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = inject(Supabase);
  const token = supabase.currentSession()?.access_token;

  if (token) {
    const reqWithHeader = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    console.log('reqWithHeader: ', reqWithHeader);
    return next(reqWithHeader);
  }

  return next(req);
};
