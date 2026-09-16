import { TestBed } from '@angular/core/testing';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpResponse,
} from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { Session } from '@supabase/supabase-js';

import { authInterceptor } from './auth-interceptor';
import { Supabase } from '../services/supabase';
import { Signal, signal } from '@angular/core';

describe('authInterceptor', () => {
  let mockCurrentSession: ReturnType<typeof signal<Session | null>>;
  let mockSupabase: Partial<Supabase>;
  let next: HttpHandlerFn;
  let capturedRequest: HttpRequest<unknown>;

  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authInterceptor(req, next));

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockCurrentSession = signal<Session | null>(null);
    mockSupabase = {
      get currentSession(): Signal<Session | null> {
        return mockCurrentSession.asReadonly();
      },
    };

    next = (req: HttpRequest<unknown>) => {
      capturedRequest = req;
      return of(new HttpResponse({ status: 200 }));
    };

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: mockSupabase }],
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should add Authorization header when session has access token', () => {
    mockCurrentSession.set({ access_token: 'test-token-123' } as Session);
    const req = new HttpRequest('GET', '/api/data');

    interceptor(req, next);

    expect(capturedRequest.headers.get('Authorization')).toBe(
      'Bearer test-token-123',
    );
  });

  it('should not add Authorization header when session is null', () => {
    mockCurrentSession.set(null);
    const req = new HttpRequest('GET', '/api/data');

    interceptor(req, next);

    expect(capturedRequest.headers.has('Authorization')).toBe(false);
  });

  it('should not add Authorization header when access_token is undefined', () => {
    mockCurrentSession.set({} as Session);
    const req = new HttpRequest('GET', '/api/data');

    interceptor(req, next);

    expect(capturedRequest.headers.has('Authorization')).toBe(false);
  });

  it('should preserve existing headers when adding Authorization', () => {
    mockCurrentSession.set({ access_token: 'my-token' } as Session);
    const req = new HttpRequest('GET', '/api/data').clone({
      setHeaders: { 'X-Custom': 'value' },
    });

    interceptor(req, next);

    expect(capturedRequest.headers.get('Authorization')).toBe(
      'Bearer my-token',
    );
    expect(capturedRequest.headers.get('X-Custom')).toBe('value');
  });

  it('should pass the request to next handler and return its response', async () => {
    mockCurrentSession.set(null);
    const req = new HttpRequest('GET', '/api/data');

    const result = interceptor(req, next);

    const response = await firstValueFrom(result);

    expect(response).toBeInstanceOf(HttpResponse);
    expect((response as HttpResponse<unknown>).status).toBe(200);
  });

  it('should pass the original request unmodified when no token', () => {
    mockCurrentSession.set(null);
    const req = new HttpRequest('GET', '/api/data');

    interceptor(req, next);

    expect(capturedRequest).toBe(req);
  });

  it('should clone the request (not mutate original) when token exists', () => {
    mockCurrentSession.set({ access_token: 'token' } as Session);
    const req = new HttpRequest('GET', '/api/data');

    interceptor(req, next);

    expect(capturedRequest).not.toBe(req);
    expect(req.headers.has('Authorization')).toBe(false);
  });
});
