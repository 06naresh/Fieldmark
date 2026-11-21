import { create } from 'zustand';
import type { StoredInspectionDraft } from '@/features/inspections/types/inspectionWorkflow';

interface InspectionDraftState {
  drafts: Record<string, StoredInspectionDraft>;
  setDraft: (key: string, draft: StoredInspectionDraft) => void;
  clearDraft: (key: string) => void;
}

/**
 * Phase 8 draft repository.
 *
 * Drafts are scoped by account and inspection so switching accounts cannot expose
 * another inspector's work. Phase 9 replaces this in-memory implementation with
 * the durable Dexie repository without changing the page-level contract.
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
