import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import type { QuotaErrorPayload } from '@opticv/datatypes';

function isQuotaErrorPayload(value: unknown): value is QuotaErrorPayload {
  const code = (value as { code?: unknown } | null)?.code;
  return (
    code === 'QUOTA_EXCEEDED' ||
    code === 'FEATURE_NOT_AVAILABLE' ||
    code === 'CV_LIMIT_EXCEEDED'
  );
}

export const quotaErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && isQuotaErrorPayload(error.error)) {
        const payload = error.error;

        if (payload.code === 'QUOTA_EXCEEDED') {
          messageService.add({
            severity: 'warn',
            summary: 'Monthly limit reached',
            detail: `You've used all your generations for this feature this month. Resets ${new Date(payload.resetsAt).toLocaleDateString()}. Upgrade your plan for a higher limit.`,
            life: 6000,
          });
        } else if (payload.code === 'FEATURE_NOT_AVAILABLE') {
          messageService.add({
            severity: 'info',
            summary: 'Not available on your plan',
            detail:
              'This feature is not included in your current plan. Upgrade to unlock it.',
            life: 6000,
          });
        } else if (payload.code === 'CV_LIMIT_EXCEEDED') {
          messageService.add({
            severity: 'warn',
            summary: 'CV storage limit reached',
            detail: `You can store up to ${payload.limit} CVs on your plan. Delete one or upgrade to add more.`,
            life: 6000,
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
