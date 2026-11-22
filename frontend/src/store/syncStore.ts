import { create } from 'zustand';
import type { LocalSyncSummary } from '@/db/localRepositories';
import type {
  ConnectivityState,
  SyncRunResult,
  SyncTrigger,
} from '@/services/sync/syncTypes';

interface SyncStoreState {
  connectivity: ConnectivityState;
  isSyncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastTrigger: SyncTrigger | null;
  summary: LocalSyncSummary | null;
  begin: (trigger: SyncTrigger) => void;
  finish: (result: SyncRunResult, summary: LocalSyncSummary | null) => void;
  fail: (message: string) => void;
  setConnectivity: (connectivity: ConnectivityState) => void;
  setSummary: (summary: LocalSyncSummary) => void;
  reset: () => void;
}

const initialState = {
  connectivity: 'online' as ConnectivityState,
  isSyncing: false,
  lastSyncAt: null,
  lastError: null,
  lastTrigger: null,
  summary: null,
};

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...initialState,
  begin: (trigger) => set({ isSyncing: true, lastTrigger: trigger, lastError: null }),
  finish: (result, summary) =>
    set({
      isSyncing: false,
      connectivity: result.connectivity,
      lastSyncAt: result.status === 'success' || result.status === 'partial' ? result.finishedAt : null,
      lastError: result.status === 'failed' ? result.message ?? 'Synchronization failed.' : null,
      summary,
    }),
  fail: (message) => set({ isSyncing: false, lastError: message }),
  setConnectivity: (connectivity) => set({ connectivity }),
  setSummary: (summary) => set({ summary }),
  reset: () => set({ ...initialState }),
}));
