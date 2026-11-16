import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import type { QuotaErrorPayload } from '@opticv/datatypes';
import { QuotaDialogStore } from '../stores/quota-dialog.store';

function isQuotaErrorPayload(value: unknown): value is QuotaErrorPayload {
  const code = (value as { code?: unknown } | null)?.code;
  return (
    code === 'QUOTA_EXCEEDED' ||
    code === 'FEATURE_NOT_AVAILABLE' ||
    code === 'CV_LIMIT_EXCEEDED'
  );
}

export const quotaErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const quotaDialogStore = inject(QuotaDialogStore);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        isQuotaErrorPayload(error.error)
      ) {
        quotaDialogStore.open(error.error);
      }
      return throwError(() => error);
    }),
  );
};
