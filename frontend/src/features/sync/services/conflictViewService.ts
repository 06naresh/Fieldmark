import {
  conflictLocalPayload,
  conflictServerPayload,
  conflictServerVersion,
  listLocalConflicts,
} from '@/db/conflictRepository';
import { conflictApi } from '@/services/api/conflictApi';
import type { LocalConflictRecord } from '@/db/localTypes';
import type { ConflictDetail } from '@/services/sync/syncTypes';
import type { ConflictView } from '@/features/sync/types/conflictView';

function localConflictView(record: LocalConflictRecord): ConflictView {
  return {
    id: record.id,
    localId: record.id,
    remoteId: record.server_conflict_id ?? null,
    operationId: record.operation_id,
    entityType: record.entity_type,
    entityId: record.entity_id,
    baseVersion:
      typeof (record.local_snapshot as { base_version?: unknown } | null)?.base_version === 'number'
        ? ((record.local_snapshot as { base_version: number }).base_version)
        : null,
    serverVersion: conflictServerVersion(record.server_snapshot),
    status: record.status,
    conflictType: record.conflict_type,
    localPayload: conflictLocalPayload(record.local_snapshot),
    serverPayload: conflictServerPayload(record.server_snapshot),
    resolutionType: (record.resolution_type as ConflictView['resolutionType']) ?? null,
    resolvedBy: record.resolved_by ?? null,
    resolvedAt: record.resolved_at,
    createdAt: record.created_at,
    source: 'local',
  };
}

function remoteConflictView(detail: ConflictDetail, local?: LocalConflictRecord): ConflictView {
  return {
    id: local?.id ?? detail.id,
    localId: local?.id ?? null,
    remoteId: detail.id,
    operationId: detail.operation_id,
    entityType: detail.entity_type,
    entityId: detail.entity_id,
    baseVersion: detail.base_version,
    serverVersion: detail.server_version,
    status: detail.status,
    conflictType: 'VERSION_CONFLICT',
    localPayload: detail.local_payload,
    serverPayload: detail.server_payload,
    resolutionType: detail.resolution_type,
    resolvedBy: detail.resolved_by,
    resolvedAt: detail.resolved_at,
    createdAt: detail.created_at,
    source: local ? 'local' : 'remote',
  };
}

/**
 * Merge durable local conflicts with authorized server conflicts.
 *
 * Local records are authoritative for preserving the submitted payload; server
 * details are authoritative for the current version and full server snapshot.
 */
export async function listConflictViews(
  ownerId: string,
  online: boolean,
): Promise<ConflictView[]> {
  // Include resolved records so the Sync Center can display the audit history
  // of an explicit decision, not only conflicts still awaiting review.
  const localRecords = await listLocalConflicts(ownerId);
  const views = new Map<string, ConflictView>(
    localRecords.map((record) => [record.id, localConflictView(record)]),
  );
  if (!online) {
    return [...views.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  const response = await conflictApi.list({ pageSize: 100 });
  for (const summary of response.data) {
    const detail = await conflictApi.detail(summary.id);
    const local =
      localRecords.find((record) => record.server_conflict_id === summary.id) ??
      localRecords.find((record) => record.operation_id === summary.operation_id);
    const view = remoteConflictView(detail, local);
    if (local) {
      views.delete(local.id);
    }
    views.set(view.id, view);
  }

  return [...views.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
