import type { SyncQueueRecord } from '@/db/localTypes';
import { RETRY_POLICY } from '@/services/sync/retryManager';

// Rejected dependencies are terminal too: the server has already made a
// decision, and dependent operations must not be blocked forever by a result
// that will never change without explicit user action.
const SATISFIED_STATUSES = new Set(['SYNCED', 'CANCELLED', 'REJECTED']);
const ELIGIBLE_STATUSES = new Set(['PENDING', 'FAILED']);

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isStartOperation(operation: SyncQueueRecord, inspectionId: string): boolean {
  return (
    operation.entity_type === 'inspection' &&
    operation.operation_type === 'UPDATE' &&
    operation.entity_id === inspectionId &&
    operation.payload.status === 'IN_PROGRESS'
  );
}

/**
 * Combine explicitly recorded dependencies with the implicit ordering required
 * by the inspection workflow. Implicit links are derived from queue contents so
 * operations created before this module existed remain safe to process.
 */
export function getOperationDependencies(
  operation: SyncQueueRecord,
  allOperations: SyncQueueRecord[],
): string[] {
  const dependencies = new Set(operation.dependencies.filter((id) => id !== operation.id));
  const inspectionId =
    readString(operation.payload.inspection_id) ??
    (operation.entity_type === 'inspection' ? operation.entity_id : null);

  if (!inspectionId) {
    return [...dependencies];
  }

  if (operation.entity_type === 'inspection_answer') {
    for (const candidate of allOperations) {
      if (isStartOperation(candidate, inspectionId)) {
        dependencies.add(candidate.id);
      }
    }
  }

  if (operation.entity_type === 'inspection' && operation.operation_type === 'SUBMIT') {
    for (const candidate of allOperations) {
      if (isStartOperation(candidate, inspectionId)) {
        dependencies.add(candidate.id);
      }
      if (
        candidate.entity_type === 'inspection_answer' &&
        readString(candidate.payload.inspection_id) === inspectionId
      ) {
        dependencies.add(candidate.id);
      }
    }
  }

  dependencies.delete(operation.id);
  return [...dependencies];
}

export interface DependencyState {
  ready: boolean;
  dependencies: string[];
  missing: string[];
  blockedBy: string[];
}

export function getDependencyState(
  operation: SyncQueueRecord,
  allOperations: SyncQueueRecord[],
  now = Date.now(),
): DependencyState {
  const dependencies = getOperationDependencies(operation, allOperations);
  const byId = new Map(allOperations.map((candidate) => [candidate.id, candidate]));
  const missing: string[] = [];
  const blockedBy: string[] = [];

  for (const dependencyId of dependencies) {
    const dependency = byId.get(dependencyId);
    if (!dependency) {
      missing.push(dependencyId);
      continue;
    }
    if (SATISFIED_STATUSES.has(dependency.status)) {
      continue;
    }
    if (dependency.status === 'FAILED' && dependency.next_retry_at) {
      const dueAt = new Date(dependency.next_retry_at).getTime();
      if (!Number.isNaN(dueAt) && dueAt <= now && dependency.attempts < RETRY_POLICY.maxAttempts) {
        // The dependency is retryable, but it must still succeed before this
        // operation may be sent.
        blockedBy.push(dependencyId);
        continue;
      }
    }
    blockedBy.push(dependencyId);
  }

  return {
    ready: missing.length === 0 && blockedBy.length === 0,
    dependencies,
    missing,
    blockedBy,
  };
}

function isEligible(operation: SyncQueueRecord, now: number): boolean {
  if (!ELIGIBLE_STATUSES.has(operation.status)) {
    return false;
  }
  if (operation.status === 'PENDING') {
    return true;
  }
  // A FAILED operation is eligible only when a retry has been scheduled. A
  // missing retry time means the retry budget was exhausted or the failure was
  // permanent; only a manual retry may move it back to PENDING.
  if (!operation.next_retry_at) {
    return false;
  }
  const dueAt = new Date(operation.next_retry_at).getTime();
  return !Number.isNaN(dueAt) && dueAt <= now;
}

/** Select a dependency-safe, bounded batch in stable creation order. */
export function selectReadyOperations(
  allOperations: SyncQueueRecord[],
  limit: number,
  now = Date.now(),
): SyncQueueRecord[] {
  if (limit <= 0) {
    return [];
  }

  const candidates = allOperations
    .filter((operation) => isEligible(operation, now))
    .sort((left, right) => left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id));

  const ready: SyncQueueRecord[] = [];
  for (const operation of candidates) {
    const state = getDependencyState(operation, allOperations, now);
    if (!state.ready) {
      continue;
    }
    ready.push(operation);
    if (ready.length >= limit) {
      break;
    }
  }
  return ready;
}
