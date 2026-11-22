import { ApiError } from '@/lib/error';

const TEMPORARY_STATUSES = new Set([0, 408, 429, 500, 502, 503, 504]);
const TEMPORARY_CODES = new Set([
  'NETWORK_ERROR',
  'TIMEOUT',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'RETRYABLE_ERROR',
]);

export const RETRY_POLICY = {
  baseDelayMs: 2_000,
  maxDelayMs: 60_000,
  maxAttempts: 6,
  jitterRatio: 0.2,
} as const;

export interface RetryDelayOptions {
  attempt: number;
  retryAfterHeader?: string | null;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  random?: () => number;
  now?: number;
}

/** Returns `Retry-After` as milliseconds from `now`, when it is usable. */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (!value) {
    return null;
  }

  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - now);
  }

  return null;
}

/** Bounded exponential backoff with symmetric jitter; `Retry-After` wins. */
export function calculateRetryDelay(options: RetryDelayOptions): number {
  const {
    attempt,
    retryAfterHeader,
    baseDelayMs = RETRY_POLICY.baseDelayMs,
    maxDelayMs = RETRY_POLICY.maxDelayMs,
    jitterRatio = RETRY_POLICY.jitterRatio,
    random = Math.random,
    now = Date.now(),
  } = options;

  const retryAfter = parseRetryAfter(retryAfterHeader, now);
  if (retryAfter !== null) {
    return Math.min(maxDelayMs * 10, retryAfter);
  }

  const safeAttempt = Math.max(1, Math.min(attempt, 20));
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (safeAttempt - 1));
  const boundedJitter = Math.min(1, Math.max(-1, random() * 2 - 1)) * jitterRatio;
  return Math.max(0, Math.min(maxDelayMs, Math.round(exponential * (1 + boundedJitter))));
}

export function retryDelayForError(
  error: unknown,
  attempt: number,
  retryAfterHeader?: string | null,
): number | null {
  if (!isRetryableSyncError(error)) {
    return null;
  }
  return calculateRetryDelay({ attempt, retryAfterHeader });
}

export function isRetryableSyncError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return TEMPORARY_STATUSES.has(error.status) || TEMPORARY_CODES.has(error.code);
  }
  if (error instanceof Error && TEMPORARY_CODES.has(error.name)) {
    return true;
  }
  // Transport failures are normalized into ApiError before reaching here; a
  // plain Error is treated as permanent so malformed client logic cannot spin.
  return false;
}

export function nextRetryAt(delayMs: number, now = Date.now()): string {
  return new Date(now + delayMs).toISOString();
}

export function hasRetryBudget(attempt: number): boolean {
  return attempt < RETRY_POLICY.maxAttempts;
}
