import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from '@/lib/accessToken';
import { CSRF_HEADER_NAME, readCsrfToken } from '@/lib/csrf';
import { DEFAULT_API_BASE_URL } from '@/lib/constants';
import { normalizeApiError } from '@/lib/error';

export { getAccessToken, setAccessToken } from '@/lib/accessToken';

type RefreshHandler = () => Promise<string | null>;

let refreshHandler: RefreshHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;

/** Register the application refresh operation without coupling Axios to auth services. */
export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

/** Share one refresh request across concurrent 401 responses. */
export function refreshAccessTokenOnce(): Promise<string | null> | null {
  if (!refreshHandler) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = refreshHandler().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase() ?? 'get';
  const isLogin = config.url?.includes('/auth/login') ?? false;
  if (!['get', 'head', 'options'].includes(method) && !isLogin) {
    const csrfToken = readCsrfToken();
    if (csrfToken) {
      config.headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = axios.isAxiosError(error) ? error : undefined;
    const config = axiosError?.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const normalized = normalizeApiError(error);
    const requestUrl = config?.url ?? '';
    const authExempt = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/refresh');

    if (normalized.status !== 401 || !config || config._retry || authExempt) {
      return Promise.reject(normalized);
    }

    config._retry = true;
    const token = await refreshAccessTokenOnce();
    if (!token) {
      return Promise.reject(normalized);
    }

    // The retried request passes through the request interceptor again, so the
    // shared in-memory token must be updated before scheduling the retry.
    setAccessToken(token);
    config.headers.Authorization = `Bearer ${token}`;
    const csrfToken = readCsrfToken();
    if (csrfToken) {
      config.headers.set(CSRF_HEADER_NAME, csrfToken);
    }
    return apiClient(config);
  },
);
