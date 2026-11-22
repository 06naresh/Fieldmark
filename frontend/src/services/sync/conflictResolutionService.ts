import {
  applyResolvedConflictLocally,
  conflictLocalPayload,
  conflictServerVersion,
  getLocalConflictByServerId,
} from '@/db/conflictRepository';
import { getOrCreateDeviceId } from '@/db/localRepositories';
import type { LocalConflictRecord, SyncQueueRecord } from '@/db/localTypes';
import { conflictApi } from '@/services/api/conflictApi';
import { normalizeApiError } from '@/lib/error';
import { canonicalJson } from '@/services/sync/operationFactory';
import { createQueueOperation } from '@/services/sync/operationFactory';
import { stableIdFromKey } from '@/lib/id';
import {
  SyncError,
  type ConflictResolutionType,
  type ConflictResolveResponse,
} from '@/services/sync/syncTypes';
import type { CurrentUser } from '@/types/auth';
import type { AnswerValue } from '@/types/entities';

export interface ManualResolutionValue {
  answer_value: AnswerValue;
  notes: string;
}

export interface ResolveConflictInput {
  ownerId: string;
  currentUser: CurrentUser;
  localConflict?: LocalConflictRecord;
  remoteConflictId: string;
  entityType: string;
  entityId: string;
  operationId: string;
  serverVersion: number | null;
  resolutionType: ConflictResolutionType;
  manualValue?: ManualResolutionValue;
}

async function confirmResolution(
  remoteConflictId: string,
  input: ResolveConflictInput,
): Promise<ConflictResolveResponse> {
  if (input.serverVersion === null) {
    throw new SyncError(
      'The latest server version is unavailable. Synchronize again before resolving.',
      'CONFLICT_VERSION_MISSING',
    );
  }

  try {
    return await conflictApi.resolve(remoteConflictId, {
      resolution_type: input.resolutionType,
      expected_server_version: input.serverVersion,
    });
  } catch (error: unknown) {
    // A local storage failure after a successful resolution must be recoverable
    // without discarding the local snapshot. Retrying a server-resolved conflict
    // is safe when the stored decision matches this explicit request.
    const normalized = normalizeApiError(error);
    if (normalized.code !== 'CONFLICT') {
      throw error;
    }
    const current = await conflictApi.detail(remoteConflictId);
    if (
      current.status !== 'RESOLVED' ||
      current.resolution_type !== input.resolutionType ||
      current.server_version !== input.serverVersion
    ) {
      throw error;
    }
    return {
      conflict_id: current.id,
      status: current.status,
      resolution_type: current.resolution_type,
      resolved_at: current.resolved_at ?? new Date().toISOString(),
    };
  }
}

async function buildResolutionOperation(
  input: ResolveConflictInput,
  localConflict: LocalConflictRecord,
): Promise<SyncQueueRecord | undefined> {
  if (input.resolutionType !== 'KEEP_LOCAL' && input.resolutionType !== 'MANUAL_MERGE') {
    return undefined;
  }

  const localPayload = conflictLocalPayload(localConflict.local_snapshot);
  const payload =
    input.resolutionType === 'MANUAL_MERGE' && input.manualValue
      ? {
          ...localPayload,
          answer_value: input.manualValue.answer_value,
          notes: input.manualValue.notes,
        }
      : localPayload;
  const id = stableIdFromKey(
    `conflict-resolution:${localConflict.id}:${input.resolutionType}:${canonicalJson(payload)}`,
  );
  const deviceId = await getOrCreateDeviceId(input.ownerId);

  return createQueueOperation({
    id,
    userId: input.ownerId,
    deviceId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: 'UPDATE',
    payload,
    baseVersion: input.serverVersion,
    dependencies: localConflict.operation_id.startsWith('pull:')
      ? []
      : [localConflict.operation_id],
  });
}

/**
 * Resolve a conflict only after the server confirms the explicit decision, then
 * apply the authoritative result to IndexedDB in one transaction.
 */
export async function resolveConflict(
  input: ResolveConflictInput,
): Promise<ConflictResolveResponse> {
  if (
    input.resolutionType === 'ADMIN_RESOLUTION' &&
    input.currentUser.role !== 'ADMIN'
  ) {
    throw new SyncError(
      'Only an administrator may apply an administrative resolution.',
      'FORBIDDEN',
    );
  }

  const localConflict =
    input.localConflict ??
    (await getLocalConflictByServerId(input.ownerId, input.remoteConflictId).catch(() => undefined));
  if (!localConflict && input.resolutionType !== 'ADMIN_RESOLUTION') {
    throw new SyncError(
      'Open this conflict on the device where it was detected to keep or merge local work.',
      'LOCAL_CONFLICT_MISSING',
    );
  }

  const serverVersion =
    input.serverVersion ?? (localConflict ? conflictServerVersion(localConflict.server_snapshot) : null);
  const response = await confirmResolution(input.remoteConflictId, {
    ...input,
    serverVersion,
  });

  if (localConflict) {
    const newOperation = await buildResolutionOperation(
      { ...input, serverVersion },
      localConflict,
    );
    await applyResolvedConflictLocally({
      ownerId: input.ownerId,
      conflictId: localConflict.id,
      resolutionType: input.resolutionType,
      resolvedBy: input.currentUser.id,
      resolvedAt: response.resolved_at,
      serverConflictId: input.remoteConflictId,
      newOperation,
    });
  }

  return response;
}
