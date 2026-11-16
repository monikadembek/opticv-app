import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { quotaErrorInterceptor } from './quota-error-interceptor';
import { QuotaDialogStore } from '../stores/quota-dialog.store';
import type { QuotaErrorPayload } from '@opticv/datatypes';

const makeReq = () => new HttpRequest('GET', '/test');

const makeNext = (error?: unknown): HttpHandlerFn =>
  error
    ? () => throwError(() => error)
    : () => of(new HttpResponse({ status: 200 }));

const run = (error?: unknown) =>
  TestBed.runInInjectionContext(() =>
    quotaErrorInterceptor(makeReq(), makeNext(error)),
  );

const quotaError = (payload: QuotaErrorPayload) =>
  new HttpErrorResponse({ status: 403, url: '/test', error: payload });

describe('quotaErrorInterceptor', () => {
  let store: InstanceType<typeof QuotaDialogStore>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    store = TestBed.inject(QuotaDialogStore);
  });

  it('opens the upgrade dialog with a QUOTA_EXCEEDED payload', async () => {
    const payload: QuotaErrorPayload = {
      code: 'QUOTA_EXCEEDED',
      feature: 'CV_OPTIMIZATION',
      limit: 1,
      resetsAt: '2026-08-01T00:00:00.000Z',
      cancelAtPeriodEnd: true,
    };

    await expect(firstValueFrom(run(quotaError(payload)))).rejects.toThrow();

    expect(store.payload()).toEqual(payload);
  });

  it('opens the upgrade dialog with a FEATURE_NOT_AVAILABLE payload', async () => {
    const payload: QuotaErrorPayload = {
      code: 'FEATURE_NOT_AVAILABLE',
      feature: 'LINKEDIN',
      limit: 0,
      resetsAt: null,
      cancelAtPeriodEnd: false,
    };

    await expect(firstValueFrom(run(quotaError(payload)))).rejects.toThrow();

    expect(store.payload()).toEqual(payload);
  });

  it('opens the upgrade dialog with a CV_LIMIT_EXCEEDED payload', async () => {
    const payload: QuotaErrorPayload = { code: 'CV_LIMIT_EXCEEDED', limit: 10 };

    await expect(firstValueFrom(run(quotaError(payload)))).rejects.toThrow();

    expect(store.payload()).toEqual(payload);
  });

  it('re-throws the original error after opening the dialog', async () => {
    const error = quotaError({ code: 'CV_LIMIT_EXCEEDED', limit: 10 });

    await expect(firstValueFrom(run(error))).rejects.toBe(error);
  });

  it('does not open the dialog for a 403 without a quota code', async () => {
    const error = new HttpErrorResponse({
      status: 403,
      url: '/test',
      error: { message: 'Forbidden' },
    });

    await expect(firstValueFrom(run(error))).rejects.toThrow();

    expect(store.isOpen()).toBe(false);
  });

  it('does not open the dialog for non-quota-error responses', async () => {
    const error = new HttpErrorResponse({
      status: 500,
      url: '/test',
      error: { message: 'boom' },
    });

    await expect(firstValueFrom(run(error))).rejects.toThrow();

    expect(store.isOpen()).toBe(false);
  });

  it('passes through successful responses unchanged', async () => {
    const result = await firstValueFrom(run());
    expect(result).toBeInstanceOf(HttpResponse);
    expect(store.isOpen()).toBe(false);
  });
});
