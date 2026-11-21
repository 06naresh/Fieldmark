import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiClient,
  setAccessToken,
  setRefreshHandler,
} from '@/lib/axios';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';

const originalAdapter = apiClient.defaults.adapter;

function clearCsrfCookie(): void {
  document.cookie = `${CSRF_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function rejectWithStatus(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): Promise<never> {
  const response: AxiosResponse = {
    data,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: {},
    config,
  };
  return Promise.reject(
    new axios.AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, undefined, response),
  );
}

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  setAccessToken(null);
  setRefreshHandler(null);
  clearCsrfCookie();
});

async function captureRequest(
  method: 'get' | 'post' = 'get',
  url = '/health',
): Promise<InternalAxiosRequestConfig> {
  let captured: InternalAxiosRequestConfig | undefined;

  const adapter: AxiosAdapter = async (config) => {
    captured = config;
    return {
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  apiClient.defaults.adapter = adapter;
  await apiClient.request({ method, url });

  if (!captured) {
    throw new Error('The request was not captured.');
  }
  return captured;
}

describe('API client', () => {
  it('uses credentialed requests and a versioned base URL', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.baseURL).toContain('/api/v1');
  });

  it('adds an in-memory access token to requests', async () => {
    setAccessToken('test-access-token');

    const config = await captureRequest();
    expect(config.headers.get('Authorization')).toBe('Bearer test-access-token');
  });

  it('does not add an Authorization header when signed out', async () => {
    const config = await captureRequest();
    expect(config.headers.get('Authorization')).toBeFalsy();
  });

  it('sends the readable CSRF cookie on cookie-authenticated mutations', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-token-value; path=/`;

    const config = await captureRequest('post', '/users');
    expect(config.headers.get(CSRF_HEADER_NAME)).toBe('csrf-token-value');
  });

  it('does not send a CSRF header on login', async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=csrf-token-value; path=/`;

    const config = await captureRequest('post', '/auth/login');
    expect(config.headers.get(CSRF_HEADER_NAME)).toBeFalsy();
  });

  it('refreshes once and retries a 401 request with the new token', async () => {
    setAccessToken('expired-token');
    const refresh = vi.fn().mockResolvedValue('fresh-token');
    setRefreshHandler(refresh);

    const captured: InternalAxiosRequestConfig[] = [];
    let attempt = 0;
    const adapter: AxiosAdapter = async (config) => {
      captured.push(config);
      attempt += 1;

      if (attempt === 1) {
        return rejectWithStatus(config, 401, {
          error: { code: 'TOKEN_EXPIRED', message: 'The access token has expired.' },
        });
      }

      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    apiClient.defaults.adapter = adapter;
    const response = await apiClient.get('/protected');

    expect(response.data).toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledOnce();
    expect(captured).toHaveLength(2);
    expect(captured[1]?.headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('does not attempt a refresh for authentication endpoints', async () => {
    const refresh = vi.fn();
    setRefreshHandler(refresh);

    const adapter: AxiosAdapter = async (config) =>
      rejectWithStatus(config, 401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
      });
    apiClient.defaults.adapter = adapter;

    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({ status: 401 });
    expect(refresh).not.toHaveBeenCalled();
  });
});
