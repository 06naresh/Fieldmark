import { createId } from '@/lib/id';

const LOCK_TTL_MS = 60_000;
const LOCK_PREFIX = 'fieldmark:sync-lock:';
const activeLocks = new Set<string>();

interface StoredLock {
  token: string;
  expiresAt: number;
}

interface WebLock {
  name: string;
}

type WebLockManager = {
  request(
    name: string,
    options: { ifAvailable: boolean },
    callback: (lock: WebLock | null) => Promise<void>,
  ): Promise<void>;
};

function storageKey(key: string): string {
  return `${LOCK_PREFIX}${key}`;
}

function readStoredLock(key: string): StoredLock | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredLock>;
    if (typeof parsed.token !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function tryWriteStoredLock(key: string, token: string): boolean {
  if (typeof localStorage === 'undefined') {
    return true;
  }
  try {
    const current = readStoredLock(key);
    if (current && current.expiresAt > Date.now() && current.token !== token) {
      return false;
    }
    localStorage.setItem(
      storageKey(key),
      JSON.stringify({ token, expiresAt: Date.now() + LOCK_TTL_MS } satisfies StoredLock),
    );
    const verified = readStoredLock(key);
    return verified?.token === token;
  } catch {
    return false;
  }
}

function clearStoredLock(key: string, token: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    if (readStoredLock(key)?.token === token) {
      localStorage.removeItem(storageKey(key));
    }
  } catch {
    // A stale TTL record is harmless; it expires on its own.
  }
}

export interface SyncLockHandle {
  release: () => Promise<void>;
}

/**
 * Serialize foreground synchronization. Web Locks are used when available;
 * a short-lived localStorage lease plus an in-process guard covers other
 * browsers. A concurrent trigger is skipped rather than queued so two calls
 * can never process the same queue records at once.
 */
export async function acquireSyncLock(key: string): Promise<SyncLockHandle | null> {
  if (activeLocks.has(key)) {
    return null;
  }
  activeLocks.add(key);

  const token = createId();
  const locks =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { locks?: WebLockManager }).locks
      : undefined;

  if (locks && typeof locks.request === 'function') {
    let acquired = false;
    let settled = false;
    let releaseWebLock: (() => void) | undefined;

    const gate = new Promise<boolean>((resolve) => {
      void locks
        .request(key, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            if (!settled) {
              settled = true;
              resolve(false);
            }
            return;
          }
          acquired = true;
          if (!settled) {
            settled = true;
            resolve(true);
          }
          await new Promise<void>((done) => {
            releaseWebLock = done;
          });
        })
        .catch(() => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        });
    });

    const granted = await gate;
    if (!granted || !acquired) {
      activeLocks.delete(key);
      return null;
    }

    let released = false;
    return {
      release: async () => {
        if (released) {
          return;
        }
        released = true;
        releaseWebLock?.();
        activeLocks.delete(key);
      },
    };
  }

  if (!tryWriteStoredLock(key, token)) {
    activeLocks.delete(key);
    return null;
  }

  let released = false;
  return {
    release: async () => {
      if (released) {
        return;
      }
      released = true;
      clearStoredLock(key, token);
      activeLocks.delete(key);
    },
  };
}
