import { create } from 'zustand';
import {
  clearLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
} from '@/db/localRepositories';
import type { StoredInspectionDraft } from '@/features/inspections/types/inspectionWorkflow';

interface InspectionDraftState {
  drafts: Record<string, StoredInspectionDraft>;
  setDraft: (key: string, draft: StoredInspectionDraft) => void;
  clearDraft: (key: string) => void;
}

/**
 * Synchronous in-memory mirror of durable drafts.
 *
 * The Zustand store keeps page rendering and the existing page-level contract
 * synchronous. IndexedDB remains the source of truth: `hydrateInspectionDraft`
 * loads from it on mount and `persistInspectionDraft` writes to it before a
 * save is reported as successful.
 */
export const useInspectionDraftStore = create<InspectionDraftState>((set) => ({
  drafts: {},
  setDraft: (key, draft) =>
    set((state) => ({
      drafts: { ...state.drafts, [key]: draft },
    })),
  clearDraft: (key) =>
    set((state) => {
      const drafts = { ...state.drafts };
      delete drafts[key];
      return { drafts };
    }),
}));

export function inspectionDraftKey(ownerId: string, inspectionId: string): string {
  return `${ownerId}:${inspectionId}`;
}

export function readInspectionDraft(key: string): StoredInspectionDraft | undefined {
  return useInspectionDraftStore.getState().drafts[key];
}

/** Serialize durable writes per draft so rapid edits cannot land out of order. */
const pendingWrites = new Map<string, Promise<void>>();

function chainWrite(key: string, write: () => Promise<void>): Promise<void> {
  const previous = pendingWrites.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  pendingWrites.set(key, next);
  void next.finally(() => {
    if (pendingWrites.get(key) === next) {
      pendingWrites.delete(key);
    }
  });
  return next;
}

/** Load a durable draft into the synchronous mirror. */
export async function hydrateInspectionDraft(
  ownerId: string,
  inspectionId: string,
): Promise<StoredInspectionDraft | null> {
  // A page may unmount while the final keystroke is still being written.
  // Wait for that durable write before reading so a remount never restores a
  // stale snapshot.
  const key = inspectionDraftKey(ownerId, inspectionId);
  await (pendingWrites.get(key) ?? Promise.resolve()).catch(() => undefined);
  const draft = await loadLocalDraft(ownerId, inspectionId);
  if (draft) {
    useInspectionDraftStore.getState().setDraft(inspectionDraftKey(ownerId, inspectionId), draft);
  }
  return draft;
}

/** Persist a draft to IndexedDB before reporting it as saved. */
export function persistInspectionDraft(draft: StoredInspectionDraft): Promise<void> {
  const key = inspectionDraftKey(draft.ownerId, draft.inspectionId);
  // Mirror immediately so the UI stays responsive; the returned promise is
  // awaited by save operations before any success state is shown.
  useInspectionDraftStore.getState().setDraft(key, draft);
  return chainWrite(key, () => saveLocalDraft(draft.ownerId, draft.inspectionId, draft));
}

export function removeInspectionDraft(ownerId: string, inspectionId: string): Promise<void> {
  const key = inspectionDraftKey(ownerId, inspectionId);
  useInspectionDraftStore.getState().clearDraft(key);
  return chainWrite(key, () => clearLocalDraft(ownerId, inspectionId));
}
