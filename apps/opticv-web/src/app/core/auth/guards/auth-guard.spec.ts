import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { vi } from 'vitest';
import { authGuard } from './auth-guard';
import { Supabase } from '../services/supabase';

const executeGuard: CanActivateFn = (...guardParameters) =>
  TestBed.runInInjectionContext(() => authGuard(...guardParameters));

describe('authGuard', () => {
  let mockSupabase: Partial<Supabase>;
  let router: Router;

  beforeEach(() => {
    mockSupabase = { getSession: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Supabase, useValue: mockSupabase }],
    });

    router = TestBed.inject(Router);
  });

  it('returns true when a session exists', async () => {
    vi.mocked(mockSupabase.getSession!).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } as never },
      error: null,
    });

    const result = await executeGuard({} as never, {} as never);

    expect(result).toBe(true);
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(mockSupabase.getSession!).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await executeGuard({} as never, {} as never);

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
