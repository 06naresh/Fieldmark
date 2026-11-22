import {
  getLocalSyncSummary,
  getOrCreateDeviceId,
  getSyncMetadata,
  setSyncMetadata,
} from '@/db/localRepositories';
import { recoverInterruptedOperations, resetFailedOperations } from '@/db/syncRepositories';
import { syncApi } from '@/services/api/syncApi';
import { connectivityManager } from '@/services/sync/connectivityManager';
import { pullRemoteChanges } from '@/services/sync/pullSync';
import { pushPendingOperations } from '@/services/sync/pushSync';
import { acquireSyncLock } from '@/services/sync/syncLock';
import type {
  ConnectivityState,
  SyncRunOptions,
  SyncRunResult,
  SyncTrigger,
} from '@/services/sync/syncTypes';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

const scheduledTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SYNC_INTERVAL_MS = 60_000;
let triggerCleanup: (() => void) | null = null;

function emptyResult(
  reason: SyncTrigger,
  startedAt: string,
  finishedAt: string,
): SyncRunResult {
  return {
    status: 'skipped',
    reason,
    connectivity: 'online',
    pushed: 0,
    accepted: 0,
    conflicts: 0,
    rejected: 0,
    retryable: 0,
    pulled: 0,
    startedAt,
    finishedAt,
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Synchronization could not be completed.';
}

/** Register (or reuse) the server-side device context for this installation. */
export async function ensureRegisteredDevice(userId: string): Promise<string> {
  const localDeviceId = await getOrCreateDeviceId(userId);
  const existing = await getSyncMetadata<string>(userId, 'server_device_id');
  if (existing) {
    return existing;
  }

  const device = await syncApi.registerDevice({
    device_name: 'Fieldmark browser',
    device_fingerprint: localDeviceId,
  });
  await setSyncMetadata(userId, 'server_device_id', device.id);
  return device.id;
}

/** Run one foreground synchronization cycle with lock and result reporting. */
export async function syncNow(options: SyncRunOptions = {}): Promise<SyncRunResult> {
  const startedAt = new Date().toISOString();
  const reason = options.reason ?? 'scheduled';
  const storeUser = useAuthStore.getState().user;
  if (!storeUser) {
    return emptyResult(reason, startedAt, new Date().toISOString());
  }
  const userId = options.userId && options.userId === storeUser.id ? options.userId : storeUser.id;

  const lock = await acquireSyncLock(`sync:${userId}`);
  if (!lock) {
    const result = emptyResult(reason, startedAt, new Date().toISOString());
    result.message = 'Synchronization is already running.';
    return result;
  }

  const syncStore = useSyncStore.getState();
  syncStore.begin(reason);

  try {
    if (!connectivityManager.isBrowserOnline()) {
      const result = emptyResult(reason, startedAt, new Date().toISOString());
      result.connectivity = 'offline';
      result.message = 'The device is offline. Local work remains queued.';
      useSyncStore.getState().finish(result, await getLocalSyncSummary(userId).catch(() => null));
      return result;
    }

    let deviceId = await ensureRegisteredDevice(userId);
    let connectivity: ConnectivityState = await connectivityManager.check(deviceId);

    // A revoked device is not an authentication failure. Replace the cached
    // registration once so future foreground syncs can continue.
    if (connectivity === 'device-inactive') {
      await setSyncMetadata(userId, 'server_device_id', null);
      deviceId = await ensureRegisteredDevice(userId);
      connectivity = await connectivityManager.check(deviceId);
    }
    useSyncStore.getState().setConnectivity(connectivity);

    if (connectivity !== 'online') {
      const result = emptyResult(reason, startedAt, new Date().toISOString());
      result.connectivity = connectivity;
      result.message =
        connectivity === 'unauthorized'
          ? 'The session is no longer valid. Sign in again.'
          : 'The synchronization service is not available. Local work remains queued.';
      useSyncStore.getState().finish(result, await getLocalSyncSummary(userId).catch(() => null));
      return result;
    }

    if (options.force) {
      await resetFailedOperations(userId);
    }
    await recoverInterruptedOperations(userId);

    const pushReport = await pushPendingOperations(userId, deviceId);
    const pullReport = await pullRemoteChanges(userId, deviceId);
    const finishedAt = new Date().toISOString();
    await setSyncMetadata(userId, 'last_sync_at', finishedAt);
    await setSyncMetadata(userId, 'last_sync_error', null);

    const result = emptyResult(reason, startedAt, finishedAt);
    result.status =
      pushReport.conflicts > 0 ||
      pushReport.rejected > 0 ||
      pushReport.retryable > 0 ||
      pullReport.conflicts > 0
        ? 'partial'
        : 'success';
    result.connectivity = connectivity;
    result.pushed = pushReport.attempted;
    result.accepted = pushReport.accepted;
    result.conflicts = pushReport.conflicts + pullReport.conflicts;
    result.rejected = pushReport.rejected;
    result.retryable = pushReport.retryable;
    result.pulled = pullReport.applied;
    if (result.status === 'partial') {
      result.message = 'Synchronization finished with items that need attention.';
    }

    const summary = await getLocalSyncSummary(userId).catch(() => null);
    useSyncStore.getState().finish(result, summary);
    return result;
  } catch (error: unknown) {
    const finishedAt = new Date().toISOString();
    const message = messageFromError(error);
    await setSyncMetadata(userId, 'last_sync_error', message).catch(() => undefined);

    const result = emptyResult(reason, startedAt, finishedAt);
    result.status = 'failed';
    result.connectivity = connectivityManager.isBrowserOnline() ? 'unreachable' : 'offline';
    result.message = message;
    useSyncStore.getState().finish(result, await getLocalSyncSummary(userId).catch(() => null));
    return result;
  } finally {
    await lock.release();
  }
}

/** Debounce foreground triggers so rapid events cannot flood the API. */
export function scheduleSync(reason: SyncTrigger = 'scheduled', delayMs = 400): void {
  const user = useAuthStore.getState().user;
  if (!user) {
    return;
  }

  const existing = scheduledTimers.get(user.id);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    scheduledTimers.delete(user.id);
    void syncNow({ userId: user.id, reason });
  }, delayMs);
  scheduledTimers.set(user.id, timer);
}

export function cancelScheduledSync(userId?: string): void {
  if (userId) {
    const timer = scheduledTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      scheduledTimers.delete(userId);
    }
    return;
  }
  for (const timer of scheduledTimers.values()) {
    clearTimeout(timer);
  }
  scheduledTimers.clear();
}

/** Install foreground-only triggers; Background Sync is not required. */
export function registerSyncTriggers(): () => void {
  if (triggerCleanup) {
    return triggerCleanup;
  }
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const unsubscribeConnectivity = connectivityManager.subscribe((online) => {
    useSyncStore.getState().setConnectivity(online ? 'online' : 'offline');
    if (online) {
      scheduleSync('online', 100);
    }
  });

  const handleVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      scheduleSync('scheduled', 1_000);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const interval = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      scheduleSync('scheduled', 0);
    }
  }, SYNC_INTERVAL_MS);

  triggerCleanup = () => {
    unsubscribeConnectivity();
    document.removeEventListener('visibilitychange', handleVisibility);
    window.clearInterval(interval);
    triggerCleanup = null;
  };
  return triggerCleanup;
}
