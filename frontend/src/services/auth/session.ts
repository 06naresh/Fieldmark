import {
  getAccessToken,
  refreshAccessTokenOnce,
  setAccessToken,
  setRefreshHandler,
} from '@/lib/axios';
import {
  endOfflineSession,
  ensureLocalAccount,
  getLatestOfflineAccount,
} from '@/db/localRepositories';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/services/api/authApi';
import { useInspectionDraftStore } from '@/features/inspections/store/inspectionDraftStore';
import { useAuthStore } from '@/store/authStore';
import type {
  CurrentUser,
  LoginCredentials,
  SignupCredentials,
  UserRole,
} from '@/types/auth';
import type { LocalUserRecord } from '@/db/localTypes';

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Rebuild the bounded, temporary offline identity from a prior online sign-in. */
function offlineUser(account: LocalUserRecord): CurrentUser {
  return {
    id: account.id,
    full_name: account.full_name ?? account.email.split('@')[0],
    email: account.email,
    role: account.role,
    is_active: true,
  };
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const result = await authApi.refresh();
    setAccessToken(result.access_token);
    return result.access_token;
  } catch {
    setAccessToken(null);
    useAuthStore.getState().clear();
    return null;
  }
}

export function registerSessionRefresh(): void {
  setRefreshHandler(refreshAccessToken);
}

/** Restore an online session using only the in-memory token or refresh cookie. */
export async function bootstrapSession(): Promise<void> {
  const store = useAuthStore.getState();
  store.startLoading();

  // A full page load clears the in-memory access token. While offline, restore
  // the bounded local session instead of asking the unavailable server to
  // refresh it. This is a temporary context; the backend revalidates on reconnect.
  if (isOffline()) {
    const account = await getLatestOfflineAccount().catch(() => null);
    setAccessToken(null);
    if (account) {
      useAuthStore.getState().setAuthenticated(offlineUser(account));
    } else {
      useAuthStore.getState().clear();
    }
    return;
  }

  let token = getAccessToken();
  if (!token) {
    token = await (refreshAccessTokenOnce() ?? refreshAccessToken());
  }

  if (!token) {
    setAccessToken(null);
    useAuthStore.getState().clear();
    return;
  }

  try {
    const user = await authApi.me();
    useAuthStore.getState().setAuthenticated(user);
    // Establish a bounded offline context after a verified online session.
    await ensureLocalAccount(user).catch(() => undefined);
  } catch {
    setAccessToken(null);
    useAuthStore.getState().clear();
  }
}

export async function signIn(credentials: LoginCredentials): Promise<UserRole> {
  const result = await authApi.login(credentials);
  const user: CurrentUser = { ...result.user, is_active: true };

  setAccessToken(result.access_token);
  useAuthStore.getState().setAuthenticated(user);
  // Offline data access requires a prior successful online authentication.
  await ensureLocalAccount(user).catch(() => undefined);
  queryClient.clear();
  return user.role;
}

/**
 * Create an inspector account, then use the ordinary login flow to establish
 * the same session contract for both new and existing users.
 */
export async function signUp(credentials: SignupCredentials): Promise<UserRole> {
  await authApi.signup(credentials);
  return signIn({ email: credentials.email, password: credentials.password });
}

export async function signOut(logoutAllDevices = false): Promise<void> {
  const signedOutUser = useAuthStore.getState().user;
  try {
    await authApi.logout(logoutAllDevices);
  } catch {
    // Local session teardown must still happen when the server is unreachable.
  } finally {
    // Explicit sign-out ends offline access while retaining durable work.
    if (signedOutUser) {
      await endOfflineSession(signedOutUser.id).catch(() => undefined);
    }
    setAccessToken(null);
    useAuthStore.getState().clear();
    // Drop the in-memory mirror so another account cannot see these drafts.
    // Durable IndexedDB records remain for offline access and synchronization.
    useInspectionDraftStore.setState({ drafts: {} });
    queryClient.clear();
  }
}
