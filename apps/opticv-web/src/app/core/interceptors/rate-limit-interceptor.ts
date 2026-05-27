import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 429) {
        const retryAfter = error.error?.retryAfter;
        const waitTimeMinutes = retryAfter ? Math.ceil(retryAfter / 60) : null;

        messageService.add({
          severity: 'warn',
          summary: 'Too many requests',
          detail: waitTimeMinutes
            ? `Please wait ${waitTimeMinutes} ${waitTimeMinutes === 1 ? 'minute' : 'minutes'} before trying again.`
            : 'Please wait a moment before trying again',
          life: 5000,
        });
      }
      return throwError(() => error);
    }),
  );
};
