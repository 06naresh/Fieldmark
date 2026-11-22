import { ApiError } from '@/lib/error';
import { syncApi } from '@/services/api/syncApi';
import type { ConnectivityState } from '@/services/sync/syncTypes';

type ConnectivityListener = (browserOnline: boolean) => void;

/** Browser events are hints; a successful authenticated API call is proof. */
class ConnectivityManager {
  private readonly listeners = new Set<ConnectivityListener>();
  private listening = false;

  isBrowserOnline(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    this.ensureListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private ensureListeners(): void {
    if (this.listening || typeof window === 'undefined') {
      return;
    }
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.listening = true;
  }

  private readonly handleOnline = (): void => {
    for (const listener of this.listeners) {
      listener(true);
    }
  };

  private readonly handleOffline = (): void => {
    for (const listener of this.listeners) {
      listener(false);
    }
  };

  async check(deviceId: string): Promise<ConnectivityState> {
    if (!this.isBrowserOnline()) {
      return 'offline';
    }

    try {
      const status = await syncApi.status(deviceId);
      return status.is_active ? 'online' : 'device-inactive';
    } catch (error: unknown) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.status === 401) {
        return 'unauthorized';
      }
      if (apiError?.status === 403) {
        return 'device-inactive';
      }
      return 'unreachable';
    }
  }
}

export const connectivityManager = new ConnectivityManager();
