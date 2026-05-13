import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseGuard } from './supabase.guard';
import { SUPABASE_CLIENT } from './supabase-client.provider';
import { UsersService } from '../users/users.service';

const mockUser = { id: 'user-id', supabaseId: 'sb-id', email: 'test@example.com' };

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

const mockUsersService = {
  upsertUser: jest.fn().mockResolvedValue(mockUser),
};

function makeContext(authHeader?: string): ExecutionContext {
  const request: Record<string, unknown> = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SupabaseGuard', () => {
  let guard: SupabaseGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseGuard,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    guard = module.get<SupabaseGuard>(SupabaseGuard);
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when token is not Bearer format', async () => {
    await expect(guard.canActivate(makeContext('Basic abc123'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when supabase.auth.getUser returns error', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('invalid token'),
    });

    await expect(
      guard.canActivate(makeContext('Bearer invalid-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('calls upsertUser and populates request.user on valid token', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'sb-id', email: 'test@example.com' } },
      error: null,
    });

    const ctx = makeContext('Bearer valid-token');
    const result = await guard.canActivate(ctx);

    expect(mockUsersService.upsertUser).toHaveBeenCalledWith({
      supabaseId: 'sb-id',
      email: 'test@example.com',
    });
    expect(ctx.switchToHttp().getRequest()['user']).toEqual(mockUser);
    expect(result).toBe(true);
  });

  it('returns true and upserts when user row does not yet exist (idempotent)', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'new-sb-id', email: 'new@example.com' } },
      error: null,
    });
    mockUsersService.upsertUser.mockResolvedValueOnce({
      id: 'new-user-id',
      supabaseId: 'new-sb-id',
      email: 'new@example.com',
    });

    const result = await guard.canActivate(makeContext('Bearer some-token'));
    expect(result).toBe(true);
    expect(mockUsersService.upsertUser).toHaveBeenCalledWith({
      supabaseId: 'new-sb-id',
      email: 'new@example.com',
    });
  });
});
