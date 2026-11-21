import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/error';
import { setAccessToken, setRefreshHandler } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { adminUser } from '@/test/fixtures';
import {
  bootstrapSession,
  refreshAccessToken,
  signIn,
  signOut,
} from '@/services/auth/session';

const api = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/services/api/authApi', () => ({
  authApi: api,
}));

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  setRefreshHandler(null);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
});

describe('auth session service', () => {
  it('stores the in-memory access token and authenticated user after login', async () => {
    api.login.mockResolvedValue({
      access_token: 'login-token',
      token_type: 'bearer',
      expires_in: 900,
      user: {
        id: adminUser.id,
        full_name: adminUser.full_name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });

    const role = await signIn({
      email: adminUser.email,
      password: 'correct-password',
    });

    expect(role).toBe('ADMIN');
    expect(api.login).toHaveBeenCalledWith({
      email: adminUser.email,
      password: 'correct-password',
    });
    expect(useAuthStore.getState().user).toEqual(adminUser);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('restores a session from an in-memory token by loading the current user', async () => {
    setAccessToken('restored-token');
    api.me.mockResolvedValue(adminUser);

    await bootstrapSession();

    expect(api.me).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().user).toEqual(adminUser);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('clears the session when a refresh attempt fails', async () => {
    useAuthStore.setState({ user: adminUser, status: 'authenticated' });
    setAccessToken('expired-token');
    api.refresh.mockRejectedValue(
      new ApiError({ code: 'INVALID_REFRESH_TOKEN', message: 'Session expired.', status: 401 }),
    );

    await expect(refreshAccessToken()).resolves.toBeNull();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('clears local session state even when server logout fails', async () => {
    useAuthStore.setState({ user: adminUser, status: 'authenticated' });
    setAccessToken('active-token');
    api.logout.mockRejectedValue(new Error('offline'));

    await signOut();

    expect(api.logout).toHaveBeenCalledWith(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
