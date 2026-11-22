import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/error';
import { setAccessToken, setRefreshHandler } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { adminUser } from '@/test/fixtures';
import type { LocalUserRecord } from '@/db/localTypes';
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

const local = vi.hoisted(() => ({
  ensureLocalAccount: vi.fn(),
  getLatestOfflineAccount: vi.fn(),
  endOfflineSession: vi.fn(),
}));

vi.mock('@/services/api/authApi', () => ({
  authApi: api,
}));

vi.mock('@/db/localRepositories', () => local);

function setNavigatorOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

function offlineAccount(): LocalUserRecord {
  return {
    id: 'offline-user-id',
    owner_id: 'offline-user-id',
    server_user_id: 'offline-user-id',
    email: 'inspector@fieldmark.test',
    full_name: 'Offline Inspector',
    role: 'INSPECTOR',
    last_authenticated_at: new Date().toISOString(),
    offline_access_expires_at: new Date(Date.now() + 60_000).toISOString(),
    created_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  local.ensureLocalAccount.mockResolvedValue(undefined);
  local.getLatestOfflineAccount.mockResolvedValue(null);
  local.endOfflineSession.mockResolvedValue(undefined);
  setNavigatorOnline(true);
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
    expect(local.ensureLocalAccount).toHaveBeenCalledWith(expect.objectContaining({
      id: adminUser.id,
      role: 'ADMIN',
    }));
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

  it('restores a bounded offline identity after a page reload while offline', async () => {
    setNavigatorOnline(false);
    local.getLatestOfflineAccount.mockResolvedValue(offlineAccount());

    await bootstrapSession();

    expect(api.refresh).not.toHaveBeenCalled();
    expect(api.me).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual({
      id: 'offline-user-id',
      full_name: 'Offline Inspector',
      email: 'inspector@fieldmark.test',
      role: 'INSPECTOR',
      is_active: true,
    });
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('does not restore an offline identity when no valid local account exists', async () => {
    setNavigatorOnline(false);
    local.getLatestOfflineAccount.mockResolvedValue(null);

    await bootstrapSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
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

  it('clears local session state and ends offline access even when server logout fails', async () => {
    useAuthStore.setState({ user: adminUser, status: 'authenticated' });
    setAccessToken('active-token');
    api.logout.mockRejectedValue(new Error('offline'));

    await signOut();

    expect(api.logout).toHaveBeenCalledWith(false);
    expect(local.endOfflineSession).toHaveBeenCalledWith(adminUser.id);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
