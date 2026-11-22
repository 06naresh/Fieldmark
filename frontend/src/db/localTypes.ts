import type { StoredInspectionDraft } from '@/features/inspections/types/inspectionWorkflow';
import type { UserRole } from '@/types/auth';
import type {
  ChecklistItem,
  ChecklistTemplate,
  Inspection,
  InspectionDetail,
  InspectionStatus,
  Site,
} from '@/types/entities';

export type QueueStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT'
  | 'REJECTED'
  | 'CANCELLED';

export type LocalSyncStatus = 'synced' | 'pending' | 'saving' | 'failed' | 'conflict';

export interface LocalUserRecord {
  id: string;
  owner_id: string;
  server_user_id: string;
  email: string;
  role: UserRole;
  last_authenticated_at: string;
  offline_access_expires_at: string;
  created_at: string;
}

export interface LocalSiteRecord {
  id: string;
  owner_id: string;
  server_id: string;
  name: string;
  location: string;
  status: string;
  server_version: number;
  updated_at: string;
  payload: Site;
}

export interface LocalInspectionRecord {
  id: string;
  owner_id: string;
  server_id: string;
  inspector_id: string;
  status: InspectionStatus;
  server_version: number;
  local_updated_at: string;
  server_updated_at: string;
  sync_status: LocalSyncStatus;
  summary: Inspection | null;
  detail: InspectionDetail | null;
  draft: StoredInspectionDraft | null;
  start_operation_id: string | null;
  submit_operation_id: string | null;
}

export interface LocalChecklistTemplateRecord {
  id: string;
  owner_id: string;
  server_id: string;
  name: string;
  revision: number;
  status: string;
  items: ChecklistItem[];
  downloaded_at: string;
  payload: ChecklistTemplate;
}

export interface LocalInspectionAnswerRecord {
  id: string;
  owner_id: string;
  inspection_id: string;
  checklist_item_id: string;
  value: InspectionDetail['answers'][number]['answer_value'];
  remarks: string;
  server_version: number;
  local_updated_at: string;
  sync_status: LocalSyncStatus;
  operation_id: string | null;
}

export interface SyncQueueRecord {
  id: string;
  user_id: string;
  device_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT';
  payload: Record<string, unknown>;
  payload_hash: string;
  base_version: number | null;
  dependencies: string[];
  status: QueueStatus;
  attempts: number;
  next_retry_at: string | null;
  created_at: string;
  last_attempt_at: string | null;
  last_error: Record<string, string> | null;
}

export interface SyncMetadataRecord {
  id: string;
  user_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export interface LocalConflictRecord {
  id: string;
  user_id: string;
  operation_id: string;
  server_conflict_id?: string | null;
  entity_type: string;
  entity_id: string;
  local_snapshot: unknown;
  server_snapshot: unknown;
  conflict_type: string;
  status: 'OPEN' | 'RESOLVED';
  resolution_type?: string | null;
  resolved_by?: string | null;
  created_at: string;
  resolved_at: string | null;
}

export class OfflinePersistenceError extends Error {
  readonly code: string;

  constructor(message: string, code = 'OFFLINE_STORAGE_ERROR') {
    super(message);
    this.name = 'OfflinePersistenceError';
    this.code = code;
  }
}

export function normalizeOfflineError(error: unknown): string {
  if (error instanceof OfflinePersistenceError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return `Local storage error: ${error.message}`;
  }
  return 'Local storage is unavailable.';
}
