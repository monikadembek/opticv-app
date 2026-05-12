import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { vi } from 'vitest';
import { Supabase } from './supabase';

// --- Supabase client mock setup ---

let authStateCallback: ((event: string, session: unknown) => void) | null =
  null;

const mockAuth = {
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
    authStateCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
};

const mockSupabaseClient = { auth: mockAuth };

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Helper to fire auth state changes
function fireAuthStateChange(event: string, session: unknown) {
  authStateCallback?.(event, session);
}

// --- Tests ---

describe('Supabase service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  // ── Construction ────────────────────────────────────────────────────────────

  describe('construction', () => {
    it('creates a SupabaseClient and calls initAuth in a browser context', async () => {
      const { createClient } = await import('@supabase/supabase-js');

      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });

      TestBed.inject(Supabase);

      expect(createClient).toHaveBeenCalledTimes(1);
      expect(mockAuth.onAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it('does NOT create a SupabaseClient in a server context', async () => {
      const { createClient } = await import('@supabase/supabase-js');

      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      TestBed.inject(Supabase);

      expect(createClient).not.toHaveBeenCalled();
    });

    it('initialises signals to null', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      const service = TestBed.inject(Supabase);

      expect(service.currentUser()).toBeNull();
      expect(service.currentSession()).toBeNull();
      expect(service.pendingEmail()).toBeNull();
    });
  });

  // ── storePendingEmail ────────────────────────────────────────────────────────

  describe('storePendingEmail()', () => {
    beforeEach(() =>
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }),
    );

    it('stores a non-null email', () => {
      const service = TestBed.inject(Supabase);
      service.setPendingEmail('user@example.com');
      expect(service.pendingEmail()).toBe('user@example.com');
    });

    it('clears the email when null is passed', () => {
      const service = TestBed.inject(Supabase);
      service.setPendingEmail('user@example.com');
      service.setPendingEmail(null);
      expect(service.pendingEmail()).toBeNull();
    });
  });

  // ── signInWithOtp ────────────────────────────────────────────────────────────

  describe('signInWithOtp()', () => {
    it('delegates to supabase.auth.signInWithOtp with correct params', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      const service = TestBed.inject(Supabase);

      service.signInWithOtp('user@example.com');

      expect(mockAuth.signInWithOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        options: { shouldCreateUser: false },
      });
    });
  });

  // ── verifyOtp ────────────────────────────────────────────────────────────────

  describe('verifyOtp()', () => {
    it('delegates to supabase.auth.verifyOtp with correct params', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      const service = TestBed.inject(Supabase);

      service.verifyOtp('123456', 'user@example.com');

      expect(mockAuth.verifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: '123456',
        type: 'email',
      });
    });
  });

  // ── signOut ──────────────────────────────────────────────────────────────────

  describe('signOut()', () => {
    it('calls supabase.auth.signOut', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      const service = TestBed.inject(Supabase);

      await service.signOut();

      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  // ── getSession ───────────────────────────────────────────────────────────────

  describe('getSession()', () => {
    it('delegates to supabase.auth.getSession', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      });
      const service = TestBed.inject(Supabase);

      service.getSession();

      expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
    });
  });

  // ── initAuth / auth state changes ────────────────────────────────────────────

  describe('initAuth() — auth state changes', () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-abc' };

    beforeEach(() =>
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
      }),
    );

    it('sets session and user on INITIAL_SESSION with a session', () => {
      const service = TestBed.inject(Supabase);

      fireAuthStateChange('INITIAL_SESSION', mockSession);

      expect(service.currentSession()).toEqual(mockSession);
      expect(service.currentUser()).toEqual(mockUser);
      expect(service.pendingEmail()).toBeNull();
    });

    it('clears user on INITIAL_SESSION when session is null', () => {
      const service = TestBed.inject(Supabase);

      fireAuthStateChange('INITIAL_SESSION', null);

      expect(service.currentSession()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('sets session and user on SIGNED_IN', () => {
      const service = TestBed.inject(Supabase);

      fireAuthStateChange('SIGNED_IN', mockSession);

      expect(service.currentSession()).toEqual(mockSession);
      expect(service.currentUser()).toEqual(mockUser);
      expect(service.pendingEmail()).toBeNull();
    });

    it('clears session and user on SIGNED_OUT', () => {
      const service = TestBed.inject(Supabase);

      // First sign in
      fireAuthStateChange('SIGNED_IN', mockSession);
      expect(service.currentUser()).toEqual(mockUser);

      // Then sign out
      fireAuthStateChange('SIGNED_OUT', null);

      expect(service.currentSession()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('clears pendingEmail on SIGNED_IN', () => {
      const service = TestBed.inject(Supabase);
      service.setPendingEmail('waiting@example.com');

      fireAuthStateChange('SIGNED_IN', mockSession);

      expect(service.pendingEmail()).toBeNull();
    });

    it('ignores unknown auth events without changing state', () => {
      const service = TestBed.inject(Supabase);

      fireAuthStateChange('TOKEN_REFRESHED', mockSession);

      expect(service.currentSession()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });
  });
});
