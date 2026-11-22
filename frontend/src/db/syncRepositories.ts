import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import { localRecordId } from '@/db/localRepositories';
import {
  OfflinePersistenceError,
  type LocalInspectionAnswerRecord,
  type LocalInspectionRecord,
  type SyncQueueRecord,
} from '@/db/localTypes';
import { normalizeApiError } from '@/lib/error';
import { createId } from '@/lib/id';
import {
  calculateRetryDelay,
  hasRetryBudget,
  isRetryableSyncError,
  nextRetryAt,
} from '@/services/sync/retryManager';
import { SyncError, type PushResult, type SyncChangeItem } from '@/services/sync/syncTypes';
import type {
  AnswerValue,
  ChecklistItem,
  ChecklistTemplate,
  Inspection,
  InspectionAnswer,
  InspectionResult,
  InspectionStatus,
  Site,
} from '@/types/entities';

const INSPECTION_STATUSES = new Set<InspectionStatus>([
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVIEWED',
  'CANCELLED',
]);
const RESPONSE_TYPES = new Set(['YES_NO', 'TEXT', 'NUMBER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']);
const NON_PENDING_STATUSES = new Set(['SYNCED', 'CANCELLED', 'REJECTED']);

function timestamp(): string {
  return new Date().toISOString();
}

function assertOwner(ownerId: string): void {
  if (!ownerId || ownerId === 'anonymous') {
    throw new OfflinePersistenceError(
      'Sign in before synchronizing local data.',
      'OFFLINE_OWNER_REQUIRED',
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new SyncError(`Synchronization change is missing ${field}.`, 'INVALID_CHANGE');
  }
  return value;
}

function optionalString(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  return typeof value === 'string' ? value : null;
}

function requiredNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SyncError(`Synchronization change has an invalid ${field}.`, 'INVALID_CHANGE');
  }
  return value;
}

function optionalNumber(record: Record<string, unknown>, field: string, fallback: number): number {
  const value = record[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function requiredBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== 'boolean') {
    throw new SyncError(`Synchronization change has an invalid ${field}.`, 'INVALID_CHANGE');
  }
  return value;
}

function asAnswerValue(value: unknown): AnswerValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }
  throw new SyncError('Synchronization change has an invalid answer value.', 'INVALID_CHANGE');
}

function errorFromResult(result: PushResult): Record<string, string> {
  return {
    code: result.error?.code ?? result.status,
    message: result.error?.message ?? result.message ?? 'The operation could not be synchronized.',
  };
}

function errorFromException(error: unknown): Record<string, string> {
  const normalized = normalizeApiError(error);
  return { code: normalized.code, message: normalized.message };
}

/**
 * Recover operations left in PROCESSING by an interrupted previous run.
 *
 * A sync lock is held for the whole run, so any PROCESSING row found here
 * cannot belong to a live local sync. Replaying is safe because operation IDs
 * and payloads never change and the backend deduplicates them durably.
 */
export async function recoverInterruptedOperations(ownerId: string): Promise<number> {
  assertOwner(ownerId);
  const interrupted = await fieldmarkLocalDb.sync_queue
    .where('[user_id+status]')
    .equals([ownerId, 'PROCESSING'])
    .toArray();

  if (interrupted.length === 0) {
    return 0;
  }

  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    for (const candidate of interrupted) {
      const current = await fieldmarkLocalDb.sync_queue.get(candidate.id);
      if (current?.status === 'PROCESSING') {
        await fieldmarkLocalDb.sync_queue.put({ ...current, status: 'PENDING' });
      }
    }
  });
  return interrupted.length;
}

export async function claimOperations(operationIds: string[]): Promise<SyncQueueRecord[]> {
  if (operationIds.length === 0) {
    return [];
  }

  const now = timestamp();
  const claimed: SyncQueueRecord[] = [];
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    for (const id of operationIds) {
      const current = await fieldmarkLocalDb.sync_queue.get(id);
      if (!current || !['PENDING', 'FAILED'].includes(current.status)) {
        continue;
      }
      const updated: SyncQueueRecord = {
        ...current,
        status: 'PROCESSING',
        attempts: current.attempts + 1,
        last_attempt_at: now,
        next_retry_at: null,
      };
      await fieldmarkLocalDb.sync_queue.put(updated);
      claimed.push(updated);
    }
  });
  return claimed;
}

async function applyAcceptedLocalState(
  ownerId: string,
  operation: SyncQueueRecord,
  result: PushResult,
  now: string,
): Promise<void> {
  const serverVersion = result.server_version;

  if (operation.entity_type === 'inspection_answer') {
    const answers = await fieldmarkLocalDb.local_inspection_answers
      .where('owner_id')
      .equals(ownerId)
      .filter((answer) => answer.operation_id === operation.id)
      .toArray();
    for (const answer of answers) {
      await fieldmarkLocalDb.local_inspection_answers.put({
        ...answer,
        server_version: serverVersion ?? answer.server_version,
        sync_status: 'synced',
        local_updated_at: now,
      });
    }
    return;
  }

  if (operation.entity_type !== 'inspection') {
    return;
  }

  const isSubmission = operation.operation_type === 'SUBMIT';
  const inspections = await fieldmarkLocalDb.local_inspections
    .where('owner_id')
    .equals(ownerId)
    .filter((record) =>
      isSubmission ? record.submit_operation_id === operation.id : record.start_operation_id === operation.id,
    )
    .toArray();

  for (const record of inspections) {
    const updated: LocalInspectionRecord = {
      ...record,
      status: isSubmission ? 'SUBMITTED' : 'IN_PROGRESS',
      server_version: serverVersion ?? record.server_version,
      server_updated_at: now,
      sync_status: 'synced',
      local_updated_at: now,
    };
    await fieldmarkLocalDb.local_inspections.put(updated);
  }
}

async function recordOperationConflict(
  ownerId: string,
  operation: SyncQueueRecord,
  result: PushResult,
  now: string,
): Promise<void> {
  const existing = await fieldmarkLocalDb.sync_conflicts
    .where('operation_id')
    .equals(operation.id)
    .first();
  if (existing) {
    return;
  }

  await fieldmarkLocalDb.sync_conflicts.put({
    id: createId(),
    user_id: ownerId,
    operation_id: operation.id,
    entity_type: operation.entity_type,
    entity_id: operation.entity_id,
    local_snapshot: {
      payload: operation.payload,
      base_version: operation.base_version,
      operation_type: operation.operation_type,
    },
    server_snapshot: {
      server_version: result.server_version ?? null,
      message: result.message ?? null,
      error: result.error ?? null,
    },
    conflict_type: 'VERSION_CONFLICT',
    status: 'OPEN',
    created_at: now,
    resolved_at: null,
  });
}

export interface PushResultCounts {
  accepted: number;
  conflicts: number;
  rejected: number;
  retryable: number;
}

/** Persist every server result and its local consequence in one transaction. */
export async function applyPushResults(
  ownerId: string,
  batch: SyncQueueRecord[],
  results: PushResult[],
): Promise<PushResultCounts> {
  assertOwner(ownerId);
  const counts: PushResultCounts = { accepted: 0, conflicts: 0, rejected: 0, retryable: 0 };
  const byOperationId = new Map(results.map((result) => [result.operation_id, result]));
  const now = timestamp();

  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.sync_queue,
    fieldmarkLocalDb.local_inspection_answers,
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.sync_conflicts,
    async () => {
      for (const submitted of batch) {
        const current = await fieldmarkLocalDb.sync_queue.get(submitted.id);
        if (!current || NON_PENDING_STATUSES.has(current.status)) {
          continue;
        }
        const result = byOperationId.get(submitted.id);
        if (!result) {
          const error = {
            code: 'MISSING_RESULT',
            message: 'The server did not report this operation.',
          };
          if (hasRetryBudget(current.attempts)) {
            counts.retryable += 1;
            await fieldmarkLocalDb.sync_queue.put({
              ...current,
              status: 'FAILED',
              last_error: error,
              next_retry_at: nextRetryAt(
                calculateRetryDelay({ attempt: current.attempts }),
                Date.now(),
              ),
            });
          } else {
            counts.rejected += 1;
            await fieldmarkLocalDb.sync_queue.put({
              ...current,
              status: 'REJECTED',
              last_error: error,
              next_retry_at: null,
            });
          }
          continue;
        }

        switch (result.status) {
          case 'ACCEPTED': {
            await fieldmarkLocalDb.sync_queue.put({
              ...current,
              status: 'SYNCED',
              last_error: null,
              next_retry_at: null,
              last_attempt_at: now,
            });
            await applyAcceptedLocalState(ownerId, current, result, now);
            counts.accepted += 1;
            break;
          }
          case 'CONFLICT': {
            await fieldmarkLocalDb.sync_queue.put({
              ...current,
              status: 'CONFLICT',
              last_error: errorFromResult(result),
              next_retry_at: null,
              last_attempt_at: now,
            });
            await recordOperationConflict(ownerId, current, result, now);
            counts.conflicts += 1;
            break;
          }
          case 'REJECTED': {
            await fieldmarkLocalDb.sync_queue.put({
              ...current,
              status: 'REJECTED',
              last_error: errorFromResult(result),
              next_retry_at: null,
              last_attempt_at: now,
            });
            counts.rejected += 1;
            break;
          }
          case 'RETRYABLE_ERROR': {
            if (hasRetryBudget(current.attempts)) {
              await fieldmarkLocalDb.sync_queue.put({
                ...current,
                status: 'FAILED',
                last_error: errorFromResult(result),
                next_retry_at: nextRetryAt(
                  calculateRetryDelay({ attempt: current.attempts }),
                  Date.now(),
                ),
                last_attempt_at: now,
              });
              counts.retryable += 1;
            } else {
              // Once the bounded budget is spent, stop scheduling automatic
              // retries. The operation and its snapshot remain for manual
              // handling instead of looping forever.
              await fieldmarkLocalDb.sync_queue.put({
                ...current,
                status: 'REJECTED',
                last_error: {
                  code: 'RETRY_LIMIT_EXCEEDED',
                  message: errorFromResult(result).message,
                },
                next_retry_at: null,
                last_attempt_at: now,
              });
              counts.rejected += 1;
            }
            break;
          }
        }
      }
    },
  );

  return counts;
}

export async function markBatchTransportFailure(
  ownerId: string,
  batch: SyncQueueRecord[],
  error: unknown,
  retryAfterHeader?: string | null,
): Promise<void> {
  assertOwner(ownerId);
  const lastError = errorFromException(error);
  const retryable = isRetryableSyncError(error);
  const now = Date.now();

  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    for (const submitted of batch) {
      const current = await fieldmarkLocalDb.sync_queue.get(submitted.id);
      if (!current || NON_PENDING_STATUSES.has(current.status)) {
        continue;
      }
      const canRetry = retryable && hasRetryBudget(current.attempts);
      if (!canRetry) {
        await fieldmarkLocalDb.sync_queue.put({
          ...current,
          status: 'REJECTED',
          last_error: {
            code: retryable ? 'RETRY_LIMIT_EXCEEDED' : lastError.code,
            message: lastError.message,
          },
          next_retry_at: null,
          last_attempt_at: new Date(now).toISOString(),
        });
        continue;
      }

      const delay = calculateRetryDelay({ attempt: current.attempts, retryAfterHeader });
      await fieldmarkLocalDb.sync_queue.put({
        ...current,
        status: 'FAILED',
        last_error: lastError,
        next_retry_at: nextRetryAt(delay, now),
        last_attempt_at: new Date(now).toISOString(),
      });
    }
  });
}

export async function resetFailedOperations(ownerId: string): Promise<number> {
  assertOwner(ownerId);
  const failed = await fieldmarkLocalDb.sync_queue
    .where('[user_id+status]')
    .equals([ownerId, 'FAILED'])
    .toArray();

  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    for (const operation of failed) {
      await fieldmarkLocalDb.sync_queue.put({
        ...operation,
        status: 'PENDING',
        next_retry_at: null,
      });
    }
  });
  return failed.length;
}

export async function getPullCursor(ownerId: string): Promise<string | null> {
  const record = await fieldmarkLocalDb.sync_metadata.get(`${ownerId}:pull_cursor`);
  return typeof record?.value === 'string' ? record.value : null;
}

function locationForSite(site: Site): string {
  return [site.address, site.city, site.state, site.postal_code, site.country]
    .filter(Boolean)
    .join(', ');
}

function parseSite(payload: Record<string, unknown> | null): Site {
  if (!payload) {
    throw new SyncError('Site change has no payload.', 'INVALID_CHANGE');
  }
  return {
    id: requiredString(payload, 'id'),
    name: requiredString(payload, 'name'),
    site_code: requiredString(payload, 'site_code'),
    address: requiredString(payload, 'address'),
    city: optionalString(payload, 'city'),
    state: optionalString(payload, 'state'),
    postal_code: optionalString(payload, 'postal_code'),
    country: optionalString(payload, 'country'),
    description: optionalString(payload, 'description'),
    is_active: requiredBoolean(payload, 'is_active'),
    version: requiredNumber(payload, 'version'),
  };
}

function parseChecklistItem(value: unknown): ChecklistItem {
  if (!isRecord(value)) {
    throw new SyncError('Checklist item has an invalid shape.', 'INVALID_CHANGE');
  }
  const responseType = requiredString(value, 'response_type');
  if (!RESPONSE_TYPES.has(responseType)) {
    throw new SyncError('Checklist item has an unsupported response type.', 'INVALID_CHANGE');
  }
  const options = value.options;
  return {
    id: requiredString(value, 'id'),
    question: requiredString(value, 'question'),
    description: optionalString(value, 'description'),
    response_type: responseType as ChecklistItem['response_type'],
    is_required: requiredBoolean(value, 'is_required'),
    display_order: requiredNumber(value, 'display_order'),
    options: isRecord(options) ? options : null,
  };
}

function parseTemplate(payload: Record<string, unknown> | null): ChecklistTemplate {
  if (!payload || !Array.isArray(payload.items)) {
    throw new SyncError('Checklist template change has no items.', 'INVALID_CHANGE');
  }
  return {
    id: requiredString(payload, 'id'),
    name: requiredString(payload, 'name'),
    description: optionalString(payload, 'description'),
    template_version: requiredNumber(payload, 'template_version'),
    is_active: requiredBoolean(payload, 'is_active'),
    version: requiredNumber(payload, 'version'),
    items: payload.items.map(parseChecklistItem),
  };
}

function parseInspection(payload: Record<string, unknown> | null): Inspection {
  if (!payload) {
    throw new SyncError('Inspection change has no payload.', 'INVALID_CHANGE');
  }
  const status = requiredString(payload, 'status');
  if (!INSPECTION_STATUSES.has(status as InspectionStatus)) {
    throw new SyncError('Inspection change has an unsupported status.', 'INVALID_CHANGE');
  }
  return {
    id: requiredString(payload, 'id'),
    site_id: requiredString(payload, 'site_id'),
    template_id: requiredString(payload, 'template_id'),
    template_version: requiredNumber(payload, 'template_version'),
    assigned_to: requiredString(payload, 'assigned_to'),
    title: requiredString(payload, 'title'),
    instructions: optionalString(payload, 'instructions'),
    scheduled_at: optionalString(payload, 'scheduled_at'),
    due_at: optionalString(payload, 'due_at'),
    status: status as InspectionStatus,
    version: requiredNumber(payload, 'version'),
  };
}

function parseAnswer(payload: Record<string, unknown> | null): InspectionAnswer {
  if (!payload) {
    throw new SyncError('Answer change has no payload.', 'INVALID_CHANGE');
  }
  const notes = payload.notes;
  return {
    id: requiredString(payload, 'id'),
    inspection_id: requiredString(payload, 'inspection_id'),
    checklist_item_id: requiredString(payload, 'checklist_item_id'),
    answer_value: asAnswerValue(payload.answer_value),
    notes: typeof notes === 'string' ? notes : null,
    version: requiredNumber(payload, 'version'),
  };
}

function hasPendingOperation(
  operations: SyncQueueRecord[],
  predicate: (operation: SyncQueueRecord) => boolean,
): boolean {
  return operations.some(
    (operation) => predicate(operation) && !NON_PENDING_STATUSES.has(operation.status),
  );
}

async function recordPullConflict(
  ownerId: string,
  change: SyncChangeItem,
  localSnapshot: unknown,
  conflictType: string,
  now: string,
): Promise<void> {
  const operationId = `pull:${change.change_id}`;
  const existing = await fieldmarkLocalDb.sync_conflicts
    .where('operation_id')
    .equals(operationId)
    .first();
  if (existing) {
    return;
  }
  await fieldmarkLocalDb.sync_conflicts.put({
    id: createId(),
    user_id: ownerId,
    operation_id: operationId,
    entity_type: change.entity_type,
    entity_id: change.entity_id,
    local_snapshot: localSnapshot,
    server_snapshot: {
      change_id: change.change_id,
      change_type: change.change_type,
      entity_version: change.entity_version,
      payload: change.payload,
    },
    conflict_type: conflictType,
    status: 'OPEN',
    created_at: now,
    resolved_at: null,
  });
}

type PullOutcome = 'applied' | 'skipped' | 'conflict';

async function applySiteChange(
  ownerId: string,
  change: SyncChangeItem,
  operations: SyncQueueRecord[],
  now: string,
): Promise<PullOutcome> {
  if (change.change_type === 'DELETE') {
    const id = localRecordId(ownerId, change.entity_id);
    const existing = await fieldmarkLocalDb.local_sites.get(id);
    if (!existing) {
      return 'skipped';
    }
    if (hasPendingOperation(operations, (operation) => operation.entity_id === change.entity_id)) {
      await recordPullConflict(ownerId, change, existing, 'SERVER_DELETION_WITH_LOCAL_WORK', now);
      return 'conflict';
    }
    await fieldmarkLocalDb.local_sites.delete(id);
    return 'applied';
  }

  const site = parseSite(change.payload);
  const id = localRecordId(ownerId, site.id);
  const existing = await fieldmarkLocalDb.local_sites.get(id);
  if (existing && existing.server_version > site.version) {
    return 'skipped';
  }
  await fieldmarkLocalDb.local_sites.put({
    id,
    owner_id: ownerId,
    server_id: site.id,
    name: site.name,
    location: locationForSite(site),
    status: site.is_active ? 'ACTIVE' : 'INACTIVE',
    server_version: site.version,
    updated_at: now,
    payload: site,
  });
  return 'applied';
}

async function applyTemplateChange(
  ownerId: string,
  change: SyncChangeItem,
  now: string,
): Promise<PullOutcome> {
  if (change.change_type === 'DELETE') {
    const records = await fieldmarkLocalDb.local_checklist_templates
      .where('owner_id')
      .equals(ownerId)
      .filter((record) => record.server_id === change.entity_id)
      .toArray();
    for (const record of records) {
      await fieldmarkLocalDb.local_checklist_templates.delete(record.id);
    }
    return records.length > 0 ? 'applied' : 'skipped';
  }

  const template = parseTemplate(change.payload);
  const id = `${ownerId}:${template.id}:${template.template_version}`;
  const existing = await fieldmarkLocalDb.local_checklist_templates.get(id);
  if (existing && existing.payload.version > template.version) {
    return 'skipped';
  }
  await fieldmarkLocalDb.local_checklist_templates.put({
    id,
    owner_id: ownerId,
    server_id: template.id,
    name: template.name,
    revision: template.template_version,
    status: template.is_active ? 'ACTIVE' : 'INACTIVE',
    items: template.items,
    downloaded_at: existing?.downloaded_at ?? now,
    payload: template,
  });
  return 'applied';
}

async function applyInspectionChange(
  ownerId: string,
  change: SyncChangeItem,
  operations: SyncQueueRecord[],
  now: string,
): Promise<PullOutcome> {
  const id = localRecordId(ownerId, change.entity_id);
  const existing = await fieldmarkLocalDb.local_inspections.get(id);

  if (change.change_type === 'DELETE') {
    if (!existing) {
      return 'skipped';
    }
    const pending = hasPendingOperation(
      operations,
      (operation) =>
        operation.entity_id === change.entity_id ||
        operation.payload.inspection_id === change.entity_id,
    );
    if (pending) {
      await recordPullConflict(ownerId, change, existing, 'SERVER_DELETION_WITH_LOCAL_WORK', now);
      return 'conflict';
    }
    await fieldmarkLocalDb.local_inspections.delete(id);
    const answers = await fieldmarkLocalDb.local_inspection_answers
      .where('inspection_id')
      .equals(change.entity_id)
      .toArray();
    for (const answer of answers) {
      if (answer.owner_id === ownerId) {
        await fieldmarkLocalDb.local_inspection_answers.delete(answer.id);
      }
    }
    return 'applied';
  }

  const inspection = parseInspection(change.payload);
  if (inspection.assigned_to !== ownerId) {
    return 'skipped';
  }
  // A repeated delivery of the same server version must remain a no-op. The
  // local operation already carries this version as its base, so treating the
  // duplicate as a new server change would create a false conflict.
  if (existing && existing.server_version >= inspection.version) {
    return 'skipped';
  }

  const hasPendingStartOrSubmit = hasPendingOperation(
    operations,
    (operation) =>
      operation.entity_type === 'inspection' && operation.entity_id === change.entity_id,
  );
  if (hasPendingStartOrSubmit) {
    await recordPullConflict(ownerId, change, existing ?? inspection, 'PENDING_INSPECTION_OPERATION', now);
    return 'conflict';
  }

  const hasPendingAnswer = hasPendingOperation(
    operations,
    (operation) =>
      operation.entity_type === 'inspection_answer' &&
      operation.payload.inspection_id === change.entity_id,
  );

  const record: LocalInspectionRecord = {
    id,
    owner_id: ownerId,
    server_id: inspection.id,
    inspector_id: inspection.assigned_to,
    status: inspection.status,
    server_version: inspection.version,
    local_updated_at: existing?.local_updated_at ?? now,
    server_updated_at: now,
    sync_status: hasPendingAnswer ? 'pending' : 'synced',
    summary: inspection,
    detail: existing?.detail ?? null,
    draft: existing?.draft ?? null,
    start_operation_id: existing?.start_operation_id ?? null,
    submit_operation_id: existing?.submit_operation_id ?? null,
  };
  await fieldmarkLocalDb.local_inspections.put(record);
  return 'applied';
}

async function applyAnswerChange(
  ownerId: string,
  change: SyncChangeItem,
  operations: SyncQueueRecord[],
  now: string,
): Promise<PullOutcome> {
  const answerId = change.entity_id;
  const id = localRecordId(ownerId, answerId);
  const existing = await fieldmarkLocalDb.local_inspection_answers.get(id);
  const pending = existing?.operation_id
    ? operations.find((operation) => operation.id === existing.operation_id)
    : undefined;

  if (pending && !NON_PENDING_STATUSES.has(pending.status)) {
    await recordPullConflict(ownerId, change, existing, 'PENDING_LOCAL_ANSWER', now);
    return 'conflict';
  }

  if (change.change_type === 'DELETE') {
    if (!existing) {
      return 'skipped';
    }
    await fieldmarkLocalDb.local_inspection_answers.delete(id);
    return 'applied';
  }

  const answer = parseAnswer(change.payload);
  if (existing && existing.server_version > answer.version) {
    return 'skipped';
  }

  const record: LocalInspectionAnswerRecord = {
    id,
    owner_id: ownerId,
    inspection_id: answer.inspection_id,
    checklist_item_id: answer.checklist_item_id,
    value: answer.answer_value,
    remarks: answer.notes ?? '',
    server_version: answer.version,
    local_updated_at: now,
    sync_status: 'synced',
    operation_id: null,
  };
  await fieldmarkLocalDb.local_inspection_answers.put(record);
  return 'applied';
}

async function applyUserChange(
  ownerId: string,
  change: SyncChangeItem,
): Promise<PullOutcome> {
  if (change.entity_id !== ownerId) {
    return 'skipped';
  }
  const existing = await fieldmarkLocalDb.local_users.get(ownerId);
  if (!existing) {
    return 'skipped';
  }

  if (change.change_type === 'DELETE' || change.payload?.is_active === false) {
    await fieldmarkLocalDb.local_users.put({
      ...existing,
      offline_access_expires_at: new Date(0).toISOString(),
    });
    return 'applied';
  }

  if (!change.payload) {
    return 'skipped';
  }
  const role = change.payload.role;
  await fieldmarkLocalDb.local_users.put({
    ...existing,
    email: typeof change.payload.email === 'string' ? change.payload.email : existing.email,
    role: role === 'ADMIN' || role === 'INSPECTOR' ? role : existing.role,
  });
  return 'applied';
}

function parseInspectionResult(payload: Record<string, unknown> | null): InspectionResult {
  if (!isRecord(payload)) {
    throw new SyncError('Synchronization change has an invalid submission result.', 'INVALID_CHANGE');
  }
  const overallStatus = requiredString(payload, 'overall_status');
  if (!['PASS', 'FAIL', 'NEEDS_REVIEW'].includes(overallStatus)) {
    throw new SyncError('Synchronization change has an invalid overall status.', 'INVALID_CHANGE');
  }
  const submittedAt = requiredString(payload, 'submitted_at');
  if (Number.isNaN(Date.parse(submittedAt))) {
    throw new SyncError('Synchronization change has an invalid submitted_at.', 'INVALID_CHANGE');
  }

  return {
    id: requiredString(payload, 'id'),
    inspection_id: requiredString(payload, 'inspection_id'),
    submission_id: requiredString(payload, 'submission_id'),
    submission_number: optionalNumber(payload, 'submission_number', 1),
    submitted_version: optionalNumber(payload, 'submitted_version', 1),
    submitted_at: submittedAt,
    summary: optionalString(payload, 'summary'),
    overall_status: overallStatus as InspectionResult['overall_status'],
  };
}

/** Cache an authoritative submission result without touching pending answers. */
async function applyResultChange(
  ownerId: string,
  change: SyncChangeItem,
  now: string,
): Promise<PullOutcome> {
  if (change.change_type === 'DELETE') {
    return 'skipped';
  }
  const result = parseInspectionResult(change.payload);
  const records = await fieldmarkLocalDb.local_inspections
    .where('owner_id')
    .equals(ownerId)
    .filter((record) => record.server_id === result.inspection_id)
    .toArray();

  let applied = false;
  for (const record of records) {
    if (!record.detail) {
      continue;
    }
    const existing = record.detail.result;
    if (
      existing &&
      new Date(existing.submitted_at).getTime() >= new Date(result.submitted_at).getTime()
    ) {
      continue;
    }
    await fieldmarkLocalDb.local_inspections.put({
      ...record,
      detail: { ...record.detail, result },
      local_updated_at: now,
    });
    applied = true;
  }
  return applied ? 'applied' : 'skipped';
}

export interface PullBatchResult {
  applied: number;
  skipped: number;
  conflicts: number;
}

/**
 * Apply one change batch and its cursor in a single IndexedDB transaction.
 * A failure leaves both the local changes and the previous cursor untouched.
 */
export async function applyPullBatch(
  ownerId: string,
  changes: SyncChangeItem[],
  nextCursor: string,
): Promise<PullBatchResult> {
  assertOwner(ownerId);
  const result: PullBatchResult = { applied: 0, skipped: 0, conflicts: 0 };
  const now = timestamp();

  await fieldmarkLocalDb.transaction(
    'rw',
    [
      fieldmarkLocalDb.local_users,
      fieldmarkLocalDb.local_sites,
      fieldmarkLocalDb.local_checklist_templates,
      fieldmarkLocalDb.local_inspections,
      fieldmarkLocalDb.local_inspection_answers,
      fieldmarkLocalDb.sync_queue,
      fieldmarkLocalDb.sync_conflicts,
      fieldmarkLocalDb.sync_metadata,
    ],
    async () => {
      const operations = await fieldmarkLocalDb.sync_queue
        .where('user_id')
        .equals(ownerId)
        .toArray();

      for (const change of changes) {
        const entityType = change.entity_type.toLowerCase();
        let outcome: PullOutcome = 'skipped';

        switch (entityType) {
          case 'site':
            outcome = await applySiteChange(ownerId, change, operations, now);
            break;
          case 'checklist_template':
            outcome = await applyTemplateChange(ownerId, change, now);
            break;
          case 'inspection':
            outcome = await applyInspectionChange(ownerId, change, operations, now);
            break;
          case 'inspection_answer':
            outcome = await applyAnswerChange(ownerId, change, operations, now);
            break;
          case 'user':
            outcome = await applyUserChange(ownerId, change);
            break;
          case 'checklist_item':
            // Template changes already carry the complete item list. The item
            // event is intentionally ignored rather than partially applied.
            break;
          case 'inspection_result':
            // The inspection change carries lifecycle status; this change
            // carries the submitted summary, result, and timestamp.
            outcome = await applyResultChange(ownerId, change, now);
            break;
          default:
            break;
        }

        if (outcome === 'applied') {
          result.applied += 1;
        } else if (outcome === 'conflict') {
          result.conflicts += 1;
        } else {
          result.skipped += 1;
        }
      }

      // The cursor is written last, inside the same transaction, so a crash
      // before commit leaves it unchanged and the batch is delivered again.
      await fieldmarkLocalDb.sync_metadata.put({
        id: `${ownerId}:pull_cursor`,
        user_id: ownerId,
        key: 'pull_cursor',
        value: nextCursor,
        updated_at: now,
      });
    },
  );

  return result;
}
