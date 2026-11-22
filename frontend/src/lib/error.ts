import axios from 'axios';
import type { ApiErrorDetail, ApiErrorPayload } from '@/types/api';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly requestId?: string;
  readonly retryAfterHeader?: string;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorDetail[];
    requestId?: string;
    retryAfterHeader?: string;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details ?? [];
    this.requestId = options.requestId;
    this.retryAfterHeader = options.retryAfterHeader;
  }
}

function readRetryAfterHeader(headers: unknown): string | undefined {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }

  const candidate = headers as Record<string, unknown> & {
    get?: (name: string) => unknown;
  };
  const value = typeof candidate.get === 'function' ? candidate.get('retry-after') : candidate['retry-after'];

  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const error = (value as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<ApiErrorPayload['error']>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const payload = error.response?.data;
    const retryAfter = readRetryAfterHeader(error.response?.headers);

    if (isApiErrorPayload(payload)) {
      return new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status,
        details: payload.error.details,
        requestId: payload.error.request_id,
        retryAfterHeader: retryAfter,
      });
    }

    if (status === 0) {
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'The server could not be reached. Check your connection and try again.',
        status,
        retryAfterHeader: retryAfter,
      });
    }

    return new ApiError({
      code: 'HTTP_ERROR',
      message: status >= 500 ? 'The server is temporarily unavailable.' : 'The request could not be completed.',
      status,
      retryAfterHeader: retryAfter,
    });
  }

  return new ApiError({
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred.',
    status: 0,
  });
}
