import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  convertToParamMap,
  Router,
  UrlTree,
} from '@angular/router';
import { vi } from 'vitest';
import { guestGuard } from './guest-guard';
import { Supabase } from '../services/supabase';

const executeGuard: CanActivateFn = (...guardParameters) =>
  TestBed.runInInjectionContext(() => guestGuard(...guardParameters));

const routeWith = (queryParams: Record<string, string> = {}) =>
  ({ queryParamMap: convertToParamMap(queryParams) }) as ActivatedRouteSnapshot;

describe('guestGuard', () => {
  let mockSupabase: Partial<Supabase>;
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockSupabase = { getSession: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: mockSupabase }],
    });

    router = TestBed.inject(Router);
  });

  it('returns true when there is no session', async () => {
    vi.mocked(mockSupabase.getSession!).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await executeGuard(routeWith(), {} as never);

    expect(result).toBe(true);
  });

  it('redirects to / when a session exists', async () => {
    vi.mocked(mockSupabase.getSession!).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } as never },
      error: null,
    });

    const result = await executeGuard(routeWith(), {} as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  describe('with a session and returnUrl', () => {
    beforeEach(() => {
      vi.mocked(mockSupabase.getSession!).mockResolvedValue({
        data: { session: { user: { id: 'u1' } } as never },
        error: null,
      });
    });

    it('redirects to returnUrl', async () => {
      const result = await executeGuard(
        routeWith({ returnUrl: '/settings' }),
        {} as never,
      );

      expect(router.serializeUrl(result as UrlTree)).toBe('/settings');
    });

    it('keeps the query string of returnUrl', async () => {
      const result = await executeGuard(
        routeWith({ returnUrl: '/settings?billing=success' }),
        {} as never,
      );

      expect(router.serializeUrl(result as UrlTree)).toBe(
        '/settings?billing=success',
      );
    });

    it.each(['//evil.com', '/login'])(
      'redirects to / when returnUrl is %s',
      async (returnUrl) => {
        const result = await executeGuard(
          routeWith({ returnUrl }),
          {} as never,
        );

        expect(router.serializeUrl(result as UrlTree)).toBe('/');
      },
    );
  });
});
