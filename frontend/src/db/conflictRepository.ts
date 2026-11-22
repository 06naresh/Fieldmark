import { conflictApi } from '@/services/api/conflictApi';
import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import { localRecordId } from '@/db/localRepositories';
import {
  OfflinePersistenceError,
  type LocalConflictRecord,
  type LocalInspectionAnswerRecord,
  type LocalInspectionRecord,
  type SyncQueueRecord,
} from '@/db/localTypes';
import { createId } from '@/lib/id';
import type { ConflictDetail, ConflictResolutionType } from '@/services/sync/syncTypes';

function assertOwner(ownerId: string): void {
  if (!ownerId || ownerId === 'anonymous') {
    throw new OfflinePersistenceError(
      'Sign in before accessing conflict data.',
      'OFFLINE_OWNER_REQUIRED',
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : null;
}

/** Extract the latest authoritative version from a cached or remote snapshot. */
export function conflictServerVersion(snapshot: unknown): number | null {
  const record = asRecord(snapshot);
  if (!record) {
    return null;
  }
  const payload = asRecord(record.payload);
  return (
    positiveNumber(record.server_version) ??
    positiveNumber(record.entity_version) ??
    positiveNumber(payload?.version)
  );
}

/** Extract the submitted local payload from a cached conflict snapshot. */
export function conflictLocalPayload(snapshot: unknown): Record<string, unknown> {
  const record = asRecord(snapshot);
  const payload = asRecord(record?.payload);
  return payload ?? record ?? {};
}

/** Extract the authoritative server payload from a cached conflict snapshot. */
export function conflictServerPayload(snapshot: unknown): Record<string, unknown> {
  const record = asRecord(snapshot);
  return asRecord(record?.payload) ?? record ?? {};
}

export async function listLocalConflicts(
  ownerId: string,
  status?: LocalConflictRecord['status'],
): Promise<LocalConflictRecord[]> {
  assertOwner(ownerId);
  const records = await fieldmarkLocalDb.sync_conflicts.where('user_id').equals(ownerId).toArray();
  return records
    .filter((record) => !status || record.status === status)
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}

export async function getLocalConflict(
  ownerId: string,
  conflictId: string,
): Promise<LocalConflictRecord | undefined> {
  assertOwner(ownerId);
  const record = await fieldmarkLocalDb.sync_conflicts.get(conflictId);
  return record?.user_id === ownerId ? record : undefined;
}

export async function getLocalConflictByServerId(
  ownerId: string,
  serverConflictId: string,
): Promise<LocalConflictRecord | undefined> {
  assertOwner(ownerId);
  const records = await fieldmarkLocalDb.sync_conflicts.where('user_id').equals(ownerId).toArray();
  return records.find((record) => record.server_conflict_id === serverConflictId);
}

function snapshotFromDetail(detail: ConflictDetail): {
  localSnapshot: Record<string, unknown>;
  serverSnapshot: Record<string, unknown>;
} {
  return {
    localSnapshot: {
      payload: detail.local_payload,
      base_version: detail.base_version,
      operation_type: 'UPDATE',
    },
    serverSnapshot: {
      payload: detail.server_payload,
      server_version: detail.server_version,
      base_version: detail.base_version,
      message: null,
    },
  };
}

/**
 * Replace partial push-result snapshots with full server conflict payloads.
 *
 * The push response intentionally returns only the server version. Fetching the
 * authoritative detail lets the Sync Center show both sides and lets local
 * resolution use the exact server state without overwriting pending work.
 */
export async function hydrateRemoteConflicts(ownerId: string): Promise<number> {
  assertOwner(ownerId);
  const response = await conflictApi.list({ status: 'OPEN', pageSize: 100 });
  let hydrated = 0;

  for (const summary of response.data) {
    const detail = await conflictApi.detail(summary.id);
    const { localSnapshot, serverSnapshot } = snapshotFromDetail(detail);

    const applied = await fieldmarkLocalDb.transaction(
      'rw',
      fieldmarkLocalDb.sync_conflicts,
      fieldmarkLocalDb.sync_queue,
      async () => {
        const existing = await fieldmarkLocalDb.sync_conflicts
          .where('operation_id')
          .equals(summary.operation_id)
          .first();
        const queued = await fieldmarkLocalDb.sync_queue.get(summary.operation_id);
        if (!existing && !queued) {
          // Conflicts from other accounts stay remote-only. The authorized
          // server API remains their source of truth.
          return false;
        }

        const record: LocalConflictRecord = existing ?? {
          id: createId(),
          user_id: ownerId,
          operation_id: summary.operation_id,
          server_conflict_id: null,
          entity_type: summary.entity_type,
          entity_id: summary.entity_id,
          local_snapshot: localSnapshot,
          server_snapshot: serverSnapshot,
          conflict_type: 'VERSION_CONFLICT',
          status: 'OPEN',
          created_at: summary.created_at,
          resolved_at: null,
        };
        await fieldmarkLocalDb.sync_conflicts.put({
          ...record,
          server_conflict_id: summary.id,
          entity_type: summary.entity_type,
          entity_id: summary.entity_id,
          local_snapshot: record.local_snapshot ?? localSnapshot,
          server_snapshot: serverSnapshot,
          status: 'OPEN',
          resolution_type: null,
          resolved_by: null,
          resolved_at: null,
        });
        return true;
      },
    );
    if (applied) {
      hydrated += 1;
    }
  }

  return hydrated;
}

export interface ApplyLocalResolutionInput {
  ownerId: string;
  conflictId: string;
  resolutionType: ConflictResolutionType;
  resolvedBy: string;
  resolvedAt: string;
  serverConflictId?: string | null;
  newOperation?: SyncQueueRecord;
}

async function findAnswerRecord(
  ownerId: string,
  conflict: LocalConflictRecord,
  serverPayload: Record<string, unknown>,
) {
  const byEntityId = await fieldmarkLocalDb.local_inspection_answers.get(
    localRecordId(ownerId, conflict.entity_id),
  );
  if (byEntityId) {
    return byEntityId;
  }
  const inspectionId =
    typeof serverPayload.inspection_id === 'string' ? serverPayload.inspection_id : null;
  const checklistItemId =
    typeof serverPayload.checklist_item_id === 'string' ? serverPayload.checklist_item_id : null;
  if (!inspectionId || !checklistItemId) {
    return undefined;
  }
  const candidates = await fieldmarkLocalDb.local_inspection_answers
    .where('[owner_id+inspection_id+checklist_item_id]')
    .equals([ownerId, inspectionId, checklistItemId])
    .toArray();
  return candidates[0];
}

/** Apply an authoritative resolution and its queue consequence atomically. */
export async function applyResolvedConflictLocally(
  input: ApplyLocalResolutionInput,
): Promise<void> {
  assertOwner(input.ownerId);
  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.sync_conflicts,
    fieldmarkLocalDb.sync_queue,
    fieldmarkLocalDb.local_inspection_answers,
    fieldmarkLocalDb.local_inspections,
    async () => {
      const conflict = await fieldmarkLocalDb.sync_conflicts.get(input.conflictId);
      if (!conflict || conflict.user_id !== input.ownerId) {
        throw new OfflinePersistenceError(
          'The local conflict record was not found.',
          'LOCAL_CONFLICT_MISSING',
        );
      }
      if (conflict.status !== 'OPEN') {
        throw new OfflinePersistenceError(
          'This conflict has already been resolved locally.',
          'LOCAL_CONFLICT_RESOLVED',
        );
      }

      await fieldmarkLocalDb.sync_conflicts.put({
        ...conflict,
        server_conflict_id: input.serverConflictId ?? conflict.server_conflict_id ?? null,
        status: 'RESOLVED',
        resolution_type: input.resolutionType,
        resolved_by: input.resolvedBy,
        resolved_at: input.resolvedAt,
      });

      const oldOperationId = conflict.operation_id.startsWith('pull:')
        ? null
        : conflict.operation_id;
      if (oldOperationId) {
        const oldOperation = await fieldmarkLocalDb.sync_queue.get(oldOperationId);
        if (oldOperation) {
          await fieldmarkLocalDb.sync_queue.put({ ...oldOperation, status: 'CANCELLED' });
        }
      }
      if (input.newOperation) {
        await fieldmarkLocalDb.sync_queue.put(input.newOperation);
      }

      const serverPayload = conflictServerPayload(conflict.server_snapshot);
      const serverVersion = conflictServerVersion(conflict.server_snapshot);

      if (conflict.entity_type === 'inspection_answer') {
        const answer = await findAnswerRecord(input.ownerId, conflict, serverPayload);
        if (!answer) {
          return;
        }
        if (input.newOperation) {
          await fieldmarkLocalDb.local_inspection_answers.put({
            ...answer,
            server_version: input.newOperation.base_version ?? answer.server_version,
            sync_status: 'pending',
            operation_id: input.newOperation.id,
            local_updated_at: new Date().toISOString(),
          });
          return;
        }
        if (input.resolutionType === 'KEEP_SERVER' || input.resolutionType === 'ADMIN_RESOLUTION') {
          await fieldmarkLocalDb.local_inspection_answers.put({
            ...answer,
            value: (serverPayload.answer_value ?? null) as LocalInspectionAnswerRecord['value'],
            remarks: typeof serverPayload.notes === 'string' ? serverPayload.notes : '',
            server_version: serverVersion ?? answer.server_version,
            sync_status: 'synced',
            operation_id: null,
            local_updated_at: new Date().toISOString(),
          });
        }
        return;
      }

      if (conflict.entity_type === 'inspection') {
        const record = await fieldmarkLocalDb.local_inspections.get(
          localRecordId(input.ownerId, conflict.entity_id),
        );
        if (!record) {
          return;
        }
        if (input.newOperation) {
          await fieldmarkLocalDb.local_inspections.put({
            ...record,
            server_version: input.newOperation.base_version ?? record.server_version,
            start_operation_id: input.newOperation.id,
            sync_status: 'pending',
            local_updated_at: new Date().toISOString(),
          });
          return;
        }
        if (input.resolutionType === 'KEEP_SERVER' || input.resolutionType === 'ADMIN_RESOLUTION') {
          const nextStatus =
            typeof serverPayload.status === 'string' ? serverPayload.status : record.status;
          await fieldmarkLocalDb.local_inspections.put({
            ...record,
            status: nextStatus as LocalInspectionRecord['status'],
            server_version: serverVersion ?? record.server_version,
            start_operation_id: null,
            submit_operation_id: null,
            sync_status: 'synced',
            local_updated_at: new Date().toISOString(),
          });
        }
      }
    },
  );
}

/** Return a permanently failed or rejected operation to the retryable queue. */
export async function retryLocalOperation(operationId: string): Promise<void> {
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    const operation = await fieldmarkLocalDb.sync_queue.get(operationId);
    if (!operation || !['FAILED', 'REJECTED'].includes(operation.status)) {
      return;
    }
    await fieldmarkLocalDb.sync_queue.put({
      ...operation,
      status: 'PENDING',
      attempts: 0,
      next_retry_at: null,
      last_error: null,
    });
  });
}
