import {
  getAccessToken,
  refreshAccessTokenOnce,
  setAccessToken,
  setRefreshHandler,
} from '@/lib/axios';
import { ensureLocalAccount } from '@/db/localRepositories';
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

  let token = getAccessToken();
  if (!token) {
    token = (await (refreshAccessTokenOnce() ?? refreshAccessToken()));
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
  try {
    await authApi.logout(logoutAllDevices);
  } catch {
    // Local session teardown must still happen when the server is unreachable.
  } finally {
    setAccessToken(null);
    useAuthStore.getState().clear();
    // Drop the in-memory mirror so another account cannot see these drafts.
    // Durable IndexedDB records remain for offline access and synchronization.
    useInspectionDraftStore.setState({ drafts: {} });
    queryClient.clear();
  }
}
