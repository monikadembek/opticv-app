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
import { rateLimitInterceptor } from './rate-limit-interceptor';

const makeReq = () => new HttpRequest('GET', '/test');

const makeNext = (error?: unknown): HttpHandlerFn =>
  error
    ? () => throwError(() => error)
    : () => of(new HttpResponse({ status: 200 }));

const run = (error?: unknown) =>
  TestBed.runInInjectionContext(() =>
    rateLimitInterceptor(makeReq(), makeNext(error)),
  );

describe('rateLimitInterceptor', () => {
  let messageService: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MessageService] });
    messageService = TestBed.inject(MessageService);
    vi.spyOn(messageService, 'add');
  });

  it('shows a warn toast on 429 response', async () => {
    const error = new HttpErrorResponse({ status: 429, url: '/test' });
    await expect(firstValueFrom(run(error))).rejects.toThrow();
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Too many requests' }),
    );
  });

  it('does not show a toast for non-429 errors', async () => {
    const error = new HttpErrorResponse({ status: 500, url: '/test' });
    await expect(firstValueFrom(run(error))).rejects.toThrow();
    expect(messageService.add).not.toHaveBeenCalled();
  });

  it('re-throws the original error after showing the toast', async () => {
    const error = new HttpErrorResponse({ status: 429, url: '/test' });
    await expect(firstValueFrom(run(error))).rejects.toBe(error);
  });

  it('passes through successful responses unchanged', async () => {
    const result = await firstValueFrom(run());
    expect(result).toBeInstanceOf(HttpResponse);
    expect(messageService.add).not.toHaveBeenCalled();
  });
});
