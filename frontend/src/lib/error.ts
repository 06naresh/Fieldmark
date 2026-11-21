import axios from 'axios';
import type { ApiErrorDetail, ApiErrorPayload } from '@/types/api';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: ApiErrorDetail[];
  readonly requestId?: string;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    details?: ApiErrorDetail[];
    requestId?: string;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details ?? [];
    this.requestId = options.requestId;
  }
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

    if (isApiErrorPayload(payload)) {
      return new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        status,
        details: payload.error.details,
        requestId: payload.error.request_id,
      });
    }

    if (status === 0) {
      return new ApiError({
        code: 'NETWORK_ERROR',
        message: 'The server could not be reached. Check your connection and try again.',
        status,
      });
    }

    return new ApiError({
      code: 'HTTP_ERROR',
      message: status >= 500 ? 'The server is temporarily unavailable.' : 'The request could not be completed.',
      status,
    });
  }

  return new ApiError({
    code: 'UNEXPECTED_ERROR',
    message: 'An unexpected error occurred.',
    status: 0,
  });
}
