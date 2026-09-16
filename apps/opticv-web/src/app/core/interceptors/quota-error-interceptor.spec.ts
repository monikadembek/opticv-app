import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { quotaErrorInterceptor } from './quota-error-interceptor';
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
  let messageService: MessageService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [MessageService] });
    messageService = TestBed.inject(MessageService);
    vi.spyOn(messageService, 'add');
  });

  describe('QUOTA_EXCEEDED', () => {
    it('shows a "won\'t renew" message with the access-ends date when cancelAtPeriodEnd and resetsAt are set', async () => {
      const error = quotaError({
        code: 'QUOTA_EXCEEDED',
        feature: 'CV_OPTIMIZATION',
        limit: 1,
        resetsAt: '2026-08-01T00:00:00.000Z',
        cancelAtPeriodEnd: true,
      });

      await expect(firstValueFrom(run(error))).rejects.toThrow();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'Limit reached',
          detail: expect.stringContaining("your plan won't renew"),
        }),
      );
    });

    it('shows a "resets on" message with an upgrade prompt when resetsAt is set and cancelAtPeriodEnd is false', async () => {
      const error = quotaError({
        code: 'QUOTA_EXCEEDED',
        feature: 'CV_OPTIMIZATION',
        limit: 1,
        resetsAt: '2026-08-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      });

      await expect(firstValueFrom(run(error))).rejects.toThrow();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'Limit reached',
          detail: expect.stringContaining('Resets'),
        }),
      );
      const detail = (messageService.add as ReturnType<typeof vi.fn>).mock
        .calls[0][0].detail;
      expect(detail).toContain('Upgrade your plan');
      expect(detail).not.toContain("won't renew");
    });

    it('shows an upgrade-only message with no date when resetsAt is null (FREE tier never renews)', async () => {
      const error = quotaError({
        code: 'QUOTA_EXCEEDED',
        feature: 'CV_OPTIMIZATION',
        limit: 1,
        resetsAt: null,
        cancelAtPeriodEnd: false,
      });

      await expect(firstValueFrom(run(error))).rejects.toThrow();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'Limit reached',
          detail: expect.stringContaining('Upgrade your plan'),
        }),
      );
      const detail = (messageService.add as ReturnType<typeof vi.fn>).mock
        .calls[0][0].detail;
      expect(detail).not.toContain('Resets');
      expect(detail).not.toContain('Invalid Date');
    });
  });

  describe('FEATURE_NOT_AVAILABLE', () => {
    it('shows a not-available-on-plan info toast', async () => {
      const error = quotaError({
        code: 'FEATURE_NOT_AVAILABLE',
        feature: 'LINKEDIN',
        limit: 0,
        resetsAt: null,
        cancelAtPeriodEnd: false,
      });

      await expect(firstValueFrom(run(error))).rejects.toThrow();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          summary: 'Not available on your plan',
        }),
      );
    });
  });

  describe('CV_LIMIT_EXCEEDED', () => {
    it('shows a CV storage limit toast including the limit', async () => {
      const error = quotaError({ code: 'CV_LIMIT_EXCEEDED', limit: 10 });

      await expect(firstValueFrom(run(error))).rejects.toThrow();

      expect(messageService.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warn',
          summary: 'CV storage limit reached',
          detail: expect.stringContaining('10 CVs'),
        }),
      );
    });
  });

  it('does not show a toast for non-quota-error responses', async () => {
    const error = new HttpErrorResponse({
      status: 500,
      url: '/test',
      error: { message: 'boom' },
    });

    await expect(firstValueFrom(run(error))).rejects.toThrow();

    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('re-throws the original error after showing a toast', async () => {
    const error = quotaError({ code: 'CV_LIMIT_EXCEEDED', limit: 10 });

    await expect(firstValueFrom(run(error))).rejects.toBe(error);
  });

  it('passes through successful responses unchanged', async () => {
    const result = await firstValueFrom(run());
    expect(result).toBeInstanceOf(HttpResponse);
    expect(messageService.add).not.toHaveBeenCalled();
  });
});
