export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT';
export type PushOperationStatus = 'ACCEPTED' | 'CONFLICT' | 'REJECTED' | 'RETRYABLE_ERROR';
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncOperationRequest {
  operation_id: string;
  operation_type: SyncOperationType;
  entity_type: string;
  entity_id: string;
  base_version: number | null;
  payload: Record<string, unknown>;
}

export interface PushResult {
  operation_id: string;
  status: PushOperationStatus;
  entity_id: string;
  base_version?: number | null;
  server_version?: number | null;
  message?: string | null;
  error?: { code: string; message: string } | null;
}

export interface SyncChangeItem {
  change_id: string;
  entity_type: string;
  entity_id: string;
  change_type: ChangeType;
  entity_version: number | null;
  payload: Record<string, unknown> | null;
}

export interface SyncPullResponse {
  changes: SyncChangeItem[];
  next_cursor: string;
  has_more: boolean;
}

export interface DeviceCreatePayload {
  device_name: string;
  device_fingerprint: string;
}

export interface DeviceResponse {
  id: string;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SyncStatusResponse {
  device_id: string;
  is_active: boolean;
  last_seen_at: string | null;
  open_conflicts: number;
}

export type ConnectivityState =
  | 'online'
  | 'offline'
  | 'unreachable'
  | 'unauthorized'
  | 'device-inactive';

export type SyncTrigger =
  | 'login'
  | 'startup'
  | 'online'
  | 'manual'
  | 'inspection-complete'
  | 'scheduled';

export type SyncRunStatus = 'success' | 'partial' | 'failed' | 'skipped';

export interface SyncRunOptions {
  userId?: string;
  reason?: SyncTrigger;
  /** Reset retry timing and run even when connectivity state looks unchanged. */
  force?: boolean;
}

export interface SyncRunResult {
  status: SyncRunStatus;
  reason: SyncTrigger;
  connectivity: ConnectivityState;
  pushed: number;
  accepted: number;
  conflicts: number;
  rejected: number;
  retryable: number;
  pulled: number;
  message?: string;
  startedAt: string;
  finishedAt: string;
}

export class SyncError extends Error {
  readonly code: string;

  constructor(message: string, code = 'SYNC_ERROR') {
    super(message);
    this.name = 'SyncError';
    this.code = code;
  }
}
