import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import {
  OfflinePersistenceError,
  type LocalInspectionAnswerRecord,
  type LocalInspectionRecord,
  type LocalUserRecord,
  type QueueStatus,
  type SyncQueueRecord,
} from '@/db/localTypes';
import type { StoredInspectionDraft } from '@/features/inspections/types/inspectionWorkflow';
import { createId } from '@/lib/id';
import { createQueueOperation, hashPayload } from '@/services/sync/operationFactory';
import type { CurrentUser } from '@/types/auth';
import type {
  AnswerValue,
  ChecklistTemplate,
  Inspection,
  InspectionDetail,
  InspectionStatus,
  OverallStatus,
  Site,
} from '@/types/entities';

const DEFAULT_OFFLINE_VALIDITY_DAYS = 7;

export function localRecordId(ownerId: string, serverId: string): string {
  return `${ownerId}:${serverId}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

function offlineValidityDays(): number {
  const configured = Number(import.meta.env.VITE_OFFLINE_SESSION_EXPIRE_DAYS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_OFFLINE_VALIDITY_DAYS;
}

function assertOwner(ownerId: string): void {
  if (!ownerId || ownerId === 'anonymous') {
    throw new OfflinePersistenceError(
      'Sign in before accessing offline inspection data.',
      'OFFLINE_OWNER_REQUIRED',
    );
  }
}

/** Record a successful online authentication without persisting credentials. */
export async function ensureLocalAccount(user: CurrentUser): Promise<void> {
  assertOwner(user.id);
  const now = new Date();
  const existing = await fieldmarkLocalDb.local_users.get(user.id);
  const expires = new Date(now.getTime() + offlineValidityDays() * 24 * 60 * 60 * 1000);

  await fieldmarkLocalDb.local_users.put({
    id: user.id,
    owner_id: user.id,
    server_user_id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    last_authenticated_at: now.toISOString(),
    offline_access_expires_at: expires.toISOString(),
    created_at: existing?.created_at ?? now.toISOString(),
  });
}

/** Return the most recently authenticated account whose offline window is still valid. */
export async function getLatestOfflineAccount(): Promise<LocalUserRecord | null> {
  const now = Date.now();
  const accounts = await fieldmarkLocalDb.local_users.toArray();
  return (
    accounts
      .filter((account) => new Date(account.offline_access_expires_at).getTime() > now)
      .sort(
        (left, right) =>
          new Date(right.last_authenticated_at).getTime() -
          new Date(left.last_authenticated_at).getTime(),
      )[0] ?? null
  );
}

/** End offline access for one account without removing its durable work. */
export async function endOfflineSession(ownerId: string): Promise<void> {
  assertOwner(ownerId);
  const account = await fieldmarkLocalDb.local_users.get(ownerId);
  if (!account) {
    return;
  }
  await fieldmarkLocalDb.local_users.put({
    ...account,
    offline_access_expires_at: new Date(0).toISOString(),
  });
}

export async function assertOfflineAccessAllowed(ownerId: string): Promise<void> {
  assertOwner(ownerId);
  const account = await fieldmarkLocalDb.local_users.get(ownerId);
  if (!account) {
    throw new OfflinePersistenceError(
      'Offline access requires a previous successful sign-in.',
      'OFFLINE_SESSION_MISSING',
    );
  }
  if (new Date(account.offline_access_expires_at).getTime() <= Date.now()) {
    throw new OfflinePersistenceError(
      'Offline access has expired. Reconnect and sign in again.',
      'OFFLINE_SESSION_EXPIRED',
    );
  }
}

export async function setSyncMetadata(
  userId: string,
  key: string,
  value: unknown,
): Promise<void> {
  assertOwner(userId);
  await fieldmarkLocalDb.sync_metadata.put({
    id: `${userId}:${key}`,
    user_id: userId,
    key,
    value,
    updated_at: timestamp(),
  });
}

export async function getSyncMetadata<T>(
  userId: string,
  key: string,
): Promise<T | undefined> {
  const record = await fieldmarkLocalDb.sync_metadata.get(`${userId}:${key}`);
  return record?.value as T | undefined;
}

export async function getOrCreateDeviceId(userId: string): Promise<string> {
  const existing = await getSyncMetadata<string>(userId, 'device_id');
  if (existing) {
    return existing;
  }
  const deviceId = createId();
  await setSyncMetadata(userId, 'device_id', deviceId);
  return deviceId;
}

function blankInspectionRecord(
  ownerId: string,
  inspection: Inspection,
  now: string,
): LocalInspectionRecord {
  return {
    id: localRecordId(ownerId, inspection.id),
    owner_id: ownerId,
    server_id: inspection.id,
    inspector_id: inspection.assigned_to,
    status: inspection.status,
    server_version: inspection.version,
    local_updated_at: now,
    server_updated_at: now,
    sync_status: 'synced',
    summary: inspection,
    detail: null,
    draft: null,
    start_operation_id: null,
    submit_operation_id: null,
  };
}

export async function saveDownloadedInspectionSummaries(
  ownerId: string,
  inspections: Inspection[],
): Promise<void> {
  assertOwner(ownerId);
  const now = timestamp();

  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.local_inspections, async () => {
    for (const inspection of inspections) {
      if (inspection.assigned_to !== ownerId) {
        continue;
      }
      const id = localRecordId(ownerId, inspection.id);
      const existing = await fieldmarkLocalDb.local_inspections.get(id);
      const base = existing ?? blankInspectionRecord(ownerId, inspection, now);
      await fieldmarkLocalDb.local_inspections.put({
        ...base,
        inspector_id: inspection.assigned_to,
        server_version: inspection.version,
        server_updated_at: base.sync_status === 'synced' ? now : base.server_updated_at,
        summary: inspection,
      });
    }
  });
}

function siteLocation(site: InspectionDetail['site']): string {
  return [site.address, site.city, site.state, site.postal_code, site.country]
    .filter(Boolean)
    .join(', ');
}

/** Cache a complete inspection detail, its site, template revision, and answers. */
export async function saveDownloadedInspectionDetail(
  ownerId: string,
  detail: InspectionDetail,
): Promise<void> {
  assertOwner(ownerId);
  await assertOfflineAccessAllowed(ownerId);
  const now = timestamp();
  const inspectionId = localRecordId(ownerId, detail.id);
  const templateId = `${ownerId}:${detail.template.id}:${detail.template.template_version}`;

  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.local_sites,
    fieldmarkLocalDb.local_checklist_templates,
    fieldmarkLocalDb.local_inspection_answers,
    async () => {
      const existing = await fieldmarkLocalDb.local_inspections.get(inspectionId);
      const base = existing ?? blankInspectionRecord(ownerId, detail, now);
      await fieldmarkLocalDb.local_inspections.put({
        ...base,
        detail,
        summary: {
          id: detail.id,
          site_id: detail.site_id,
          template_id: detail.template_id,
          template_version: detail.template_version,
          assigned_to: detail.assigned_to,
          title: detail.title,
          instructions: detail.instructions,
          scheduled_at: detail.scheduled_at,
          due_at: detail.due_at,
          status: base.status,
          version: base.server_version,
        },
      });

      await fieldmarkLocalDb.local_sites.put({
        id: localRecordId(ownerId, detail.site.id),
        owner_id: ownerId,
        server_id: detail.site.id,
        name: detail.site.name,
        location: siteLocation(detail.site),
        status: detail.site.is_active ? 'ACTIVE' : 'INACTIVE',
        server_version: detail.site.version,
        updated_at: now,
        payload: detail.site,
      });

      await fieldmarkLocalDb.local_checklist_templates.put({
        id: templateId,
        owner_id: ownerId,
        server_id: detail.template.id,
        name: detail.template.name,
        revision: detail.template.template_version,
        status: detail.template.is_active ? 'ACTIVE' : 'INACTIVE',
        items: detail.checklist_items,
        downloaded_at: now,
        payload: detail.template,
      });

      for (const answer of detail.answers) {
        const answerId = localRecordId(ownerId, answer.id);
        const existingAnswer = await fieldmarkLocalDb.local_inspection_answers.get(answerId);
        const hasLocalChanges =
          existingAnswer?.sync_status === 'pending' || existingAnswer?.sync_status === 'saving';
        if (hasLocalChanges) {
          continue;
        }
        await fieldmarkLocalDb.local_inspection_answers.put({
          id: answerId,
          owner_id: ownerId,
          inspection_id: detail.id,
          checklist_item_id: answer.checklist_item_id,
          value: answer.answer_value,
          remarks: answer.notes ?? '',
          server_version: answer.version,
          local_updated_at: now,
          sync_status: 'synced',
          operation_id: null,
        });
      }
    },
  );
}

export async function listLocalInspectionIds(ownerId: string): Promise<string[]> {
  const records = await fieldmarkLocalDb.local_inspections
    .where('owner_id')
    .equals(ownerId)
    .toArray();
  return records.filter((record) => record.detail !== null).map((record) => record.server_id);
}

export async function listLocalInspections(ownerId: string): Promise<Inspection[]> {
  assertOwner(ownerId);
  const records = await fieldmarkLocalDb.local_inspections
    .where('owner_id')
    .equals(ownerId)
    .toArray();

  return records
    .map((record) => {
      const base = record.summary;
      if (!base) {
        return null;
      }
      return {
        ...base,
        status: record.status,
        version: record.server_version,
      };
    })
    .filter((inspection): inspection is Inspection => inspection !== null);
}

export async function getLocalInspectionDetail(
  ownerId: string,
  inspectionId: string,
): Promise<InspectionDetail | null> {
  assertOwner(ownerId);
  await assertOfflineAccessAllowed(ownerId);
  const record = await fieldmarkLocalDb.local_inspections.get(localRecordId(ownerId, inspectionId));
  if (!record?.detail) {
    return null;
  }

  const answerRecords = await fieldmarkLocalDb.local_inspection_answers
    .where('inspection_id')
    .equals(inspectionId)
    .toArray();
  const localAnswers = answerRecords
    .filter((answer) => answer.owner_id === ownerId)
    .map((answer) => ({
      id: answer.id.split(':').slice(1).join(':'),
      inspection_id: answer.inspection_id,
      checklist_item_id: answer.checklist_item_id,
      answer_value: answer.value,
      notes: answer.remarks,
      version: answer.server_version,
    }));
  const serverAnswers = record.detail.answers.filter(
    (answer) => !localAnswers.some((local) => local.checklist_item_id === answer.checklist_item_id),
  );

  let pendingSubmission: InspectionDetail['pending_submission'] = null;
  if (record.submit_operation_id) {
    const submission = await fieldmarkLocalDb.sync_queue.get(record.submit_operation_id);
    const status = submission?.payload.overall_status;
    if (
      submission &&
      submission.status !== 'SYNCED' &&
      (status === 'PASS' || status === 'FAIL' || status === 'NEEDS_REVIEW')
    ) {
      pendingSubmission = {
        summary: typeof submission.payload.summary === 'string' ? submission.payload.summary : null,
        overall_status: status,
      };
    }
  }

  return {
    ...record.detail,
    status: record.status,
    version: record.server_version,
    answers: [...serverAnswers, ...localAnswers],
    pending_submission: pendingSubmission,
  };
}

export async function getLocalInspectionRecord(
  ownerId: string,
  inspectionId: string,
): Promise<LocalInspectionRecord | undefined> {
  return fieldmarkLocalDb.local_inspections.get(localRecordId(ownerId, inspectionId));
}

export async function saveLocalDraft(
  ownerId: string,
  inspectionId: string,
  draft: StoredInspectionDraft,
): Promise<void> {
  assertOwner(ownerId);
  const id = localRecordId(ownerId, inspectionId);
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.local_inspections, async () => {
    const record = await fieldmarkLocalDb.local_inspections.get(id);
    const now = timestamp();
    const base: LocalInspectionRecord = record ?? {
      id,
      owner_id: ownerId,
      server_id: inspectionId,
      inspector_id: ownerId,
      status: 'IN_PROGRESS',
      server_version: draft.inspectionVersion,
      local_updated_at: now,
      server_updated_at: now,
      sync_status: 'pending',
      summary: null,
      detail: null,
      draft: null,
      start_operation_id: null,
      submit_operation_id: null,
    };
    await fieldmarkLocalDb.local_inspections.put({
      ...base,
      draft,
      local_updated_at: now,
    });
  });
}

export async function loadLocalDraft(
  ownerId: string,
  inspectionId: string,
): Promise<StoredInspectionDraft | null> {
  assertOwner(ownerId);
  await assertOfflineAccessAllowed(ownerId);
  const record = await fieldmarkLocalDb.local_inspections.get(localRecordId(ownerId, inspectionId));
  return record?.draft ?? null;
}

export async function clearLocalDraft(ownerId: string, inspectionId: string): Promise<void> {
  const id = localRecordId(ownerId, inspectionId);
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.local_inspections, async () => {
    const record = await fieldmarkLocalDb.local_inspections.get(id);
    if (!record) {
      return;
    }
    await fieldmarkLocalDb.local_inspections.put({ ...record, draft: null, local_updated_at: timestamp() });
  });
}

function answerRecordId(ownerId: string, answerId: string): string {
  return localRecordId(ownerId, answerId);
}

export async function saveLocalAnswer(
  ownerId: string,
  answer: Omit<LocalInspectionAnswerRecord, 'owner_id' | 'id'> & { id?: string },
): Promise<LocalInspectionAnswerRecord> {
  assertOwner(ownerId);
  const record: LocalInspectionAnswerRecord = {
    ...answer,
    id: answer.id ?? answerRecordId(ownerId, createId()),
    owner_id: ownerId,
    local_updated_at: timestamp(),
  };
  await fieldmarkLocalDb.local_inspection_answers.put(record);
  return record;
}

interface AnswerOperationInput {
  ownerId: string;
  inspectionId: string;
  checklistItemId: string;
  answerId: string;
  value: AnswerValue;
  notes: string;
  baseVersion: number;
}

/** Persist an answer and its durable operation atomically. */
export async function queueAnswerChange(input: AnswerOperationInput): Promise<SyncQueueRecord> {
  assertOwner(input.ownerId);
  const answerKey = answerRecordId(input.ownerId, input.answerId);
  const existingAnswer = await fieldmarkLocalDb.local_inspection_answers.get(answerKey);
  const existingOperation = existingAnswer?.operation_id
    ? await fieldmarkLocalDb.sync_queue.get(existingAnswer.operation_id)
    : undefined;
  const inspectionRecord = await getLocalInspectionRecord(input.ownerId, input.inspectionId);
  const dependencies = inspectionRecord?.start_operation_id
    ? [inspectionRecord.start_operation_id]
    : [];

  // A pending, unsent operation may be coalesced. Sent or terminal operations
  // are immutable; a later local edit receives a new operation ID.
  const canReuse = existingOperation?.status === 'PENDING';
  const now = timestamp();
  const payload = {
    inspection_id: input.inspectionId,
    checklist_item_id: input.checklistItemId,
    answer_value: input.value,
    notes: input.notes,
  };
  const deviceId = await getOrCreateDeviceId(input.ownerId);
  const operation =
    canReuse && existingOperation
      ? {
          ...existingOperation,
          payload,
          // The payload changed, so its identity hash must change with it.
          // A stable operation ID is safe here only because the operation has
          // not been sent yet.
          payload_hash: await hashPayload(payload),
          base_version: input.baseVersion,
          dependencies,
        }
      : await createQueueOperation({
          id: canReuse ? existingOperation?.id : undefined,
          userId: input.ownerId,
          deviceId,
          entityType: 'inspection_answer',
          entityId: input.answerId,
          operationType: input.baseVersion <= 1 ? 'CREATE' : 'UPDATE',
          payload,
          baseVersion: input.baseVersion,
          dependencies,
          createdAt: now,
        });

  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspection_answers,
    fieldmarkLocalDb.sync_queue,
    async () => {
      await fieldmarkLocalDb.local_inspection_answers.put({
        id: answerKey,
        owner_id: input.ownerId,
        inspection_id: input.inspectionId,
        checklist_item_id: input.checklistItemId,
        value: input.value,
        remarks: input.notes,
        server_version: input.baseVersion,
        local_updated_at: now,
        sync_status: 'pending',
        operation_id: operation.id,
      });
      await fieldmarkLocalDb.sync_queue.put(operation);
    },
  );

  return operation;
}

export async function markAnswerConfirmed(
  ownerId: string,
  answerId: string,
  serverVersion: number,
): Promise<void> {
  const answerKey = answerRecordId(ownerId, answerId);
  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspection_answers,
    fieldmarkLocalDb.sync_queue,
    async () => {
      const answer = await fieldmarkLocalDb.local_inspection_answers.get(answerKey);
      if (!answer) {
        return;
      }
      await fieldmarkLocalDb.local_inspection_answers.put({
        ...answer,
        server_version: serverVersion,
        sync_status: 'synced',
        local_updated_at: timestamp(),
      });
      if (answer.operation_id) {
        await markQueueStatus(answer.operation_id, 'SYNCED');
      }
    },
  );
}

export async function getAnswerRecord(
  ownerId: string,
  answerId: string,
): Promise<LocalInspectionAnswerRecord | undefined> {
  return fieldmarkLocalDb.local_inspection_answers.get(answerRecordId(ownerId, answerId));
}

export async function markQueueStatus(
  operationId: string,
  status: QueueStatus,
  error?: Record<string, string>,
): Promise<void> {
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_queue, async () => {
    const operation = await fieldmarkLocalDb.sync_queue.get(operationId);
    if (!operation) {
      return;
    }
    await fieldmarkLocalDb.sync_queue.put({
      ...operation,
      status,
      last_attempt_at: status === 'PENDING' ? operation.last_attempt_at : timestamp(),
      last_error: error ?? null,
    });
  });
}

export async function countQueueOperations(
  ownerId: string,
  statuses?: QueueStatus[],
): Promise<number> {
  const operations = await fieldmarkLocalDb.sync_queue.where('user_id').equals(ownerId).toArray();
  return statuses ? operations.filter((operation) => statuses.includes(operation.status)).length : operations.length;
}

export async function listQueueOperations(ownerId: string): Promise<SyncQueueRecord[]> {
  return fieldmarkLocalDb.sync_queue.where('user_id').equals(ownerId).toArray();
}

export async function queueInspectionStart(
  ownerId: string,
  detail: InspectionDetail,
): Promise<string> {
  assertOwner(ownerId);
  const record = await getLocalInspectionRecord(ownerId, detail.id);
  if (!record) {
    throw new OfflinePersistenceError(
      'Download this inspection before starting it offline.',
      'LOCAL_INSPECTION_MISSING',
    );
  }
  if (record.start_operation_id) {
    return record.start_operation_id;
  }

  const deviceId = await getOrCreateDeviceId(ownerId);
  const operation = await createQueueOperation({
    userId: ownerId,
    deviceId,
    entityType: 'inspection',
    entityId: detail.id,
    operationType: 'UPDATE',
    payload: { status: 'IN_PROGRESS' },
    baseVersion: detail.version,
  });

  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.sync_queue,
    async () => {
      const current = await fieldmarkLocalDb.local_inspections.get(record.id);
      if (!current) {
        return;
      }
      await fieldmarkLocalDb.local_inspections.put({
        ...current,
        start_operation_id: operation.id,
        status: 'IN_PROGRESS',
        sync_status: 'pending',
        local_updated_at: timestamp(),
      });
      await fieldmarkLocalDb.sync_queue.put(operation);
    },
  );

  return operation.id;
}

export async function markInspectionStarted(
  ownerId: string,
  inspectionId: string,
  version: number,
): Promise<void> {
  const id = localRecordId(ownerId, inspectionId);
  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.sync_queue,
    async () => {
      const record = await fieldmarkLocalDb.local_inspections.get(id);
      if (!record) {
        return;
      }
      await fieldmarkLocalDb.local_inspections.put({
        ...record,
        status: 'IN_PROGRESS',
        server_version: version,
        sync_status: 'synced',
        local_updated_at: timestamp(),
      });
      if (record.start_operation_id) {
        await markQueueStatus(record.start_operation_id, 'SYNCED');
      }
    },
  );
}

export async function queueInspectionSubmission(
  ownerId: string,
  detail: InspectionDetail,
  submissionId: string,
  summary: string | null,
  overallStatus: OverallStatus,
): Promise<string> {
  assertOwner(ownerId);
  const record = await getLocalInspectionRecord(ownerId, detail.id);
  if (!record) {
    throw new OfflinePersistenceError(
      'Download this inspection before submitting it offline.',
      'LOCAL_INSPECTION_MISSING',
    );
  }
  if (record.submit_operation_id) {
    return record.submit_operation_id;
  }

  const deviceId = await getOrCreateDeviceId(ownerId);
  const startOperation = record.start_operation_id
    ? await fieldmarkLocalDb.sync_queue.get(record.start_operation_id)
    : undefined;
  const answerOperations = await fieldmarkLocalDb.sync_queue
    .where('user_id')
    .equals(ownerId)
    .filter(
      (candidate) =>
        candidate.entity_type === 'inspection_answer' &&
        candidate.payload.inspection_id === detail.id,
    )
    .toArray();
  const dependencies = [
    ...new Set([
      ...(record.start_operation_id ? [record.start_operation_id] : []),
      ...answerOperations.map((candidate) => candidate.id),
    ]),
  ];

  // Starting an accepted inspection increments its server version. A queued
  // start therefore means the submission must be based on the predicted next
  // version, otherwise it would conflict when connectivity returns.
  const baseVersion = startOperation
    ? (startOperation.base_version ?? detail.version) + 1
    : record.server_version || detail.version;

  const operation = await createQueueOperation({
    userId: ownerId,
    deviceId,
    entityType: 'inspection',
    entityId: detail.id,
    operationType: 'SUBMIT',
    payload: {
      submission_id: submissionId,
      summary,
      overall_status: overallStatus,
    },
    baseVersion,
    dependencies,
  });

  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.sync_queue,
    async () => {
      const current = await fieldmarkLocalDb.local_inspections.get(record.id);
      if (!current) {
        return;
      }
      await fieldmarkLocalDb.local_inspections.put({
        ...current,
        submit_operation_id: operation.id,
        status: 'SUBMITTED',
        sync_status: 'pending',
        local_updated_at: timestamp(),
      });
      await fieldmarkLocalDb.sync_queue.put(operation);
    },
  );

  return operation.id;
}

export async function markInspectionSubmitted(
  ownerId: string,
  inspectionId: string,
  status: InspectionStatus,
): Promise<void> {
  const id = localRecordId(ownerId, inspectionId);
  await fieldmarkLocalDb.transaction(
    'rw',
    fieldmarkLocalDb.local_inspections,
    fieldmarkLocalDb.sync_queue,
    async () => {
      const record = await fieldmarkLocalDb.local_inspections.get(id);
      if (!record) {
        return;
      }
      await fieldmarkLocalDb.local_inspections.put({
        ...record,
        status,
        sync_status: 'synced',
        local_updated_at: timestamp(),
      });
      if (record.submit_operation_id) {
        await markQueueStatus(record.submit_operation_id, 'SYNCED');
      }
    },
  );
}

/** Locally cached sites used for labels while offline. */
export async function listLocalSites(ownerId: string): Promise<Site[]> {
  const records = await fieldmarkLocalDb.local_sites.where('owner_id').equals(ownerId).toArray();
  return records.map((record) => record.payload);
}

/** Locally cached checklist templates used for labels while offline. */
export async function listLocalTemplates(ownerId: string): Promise<ChecklistTemplate[]> {
  const records = await fieldmarkLocalDb.local_checklist_templates
    .where('owner_id')
    .equals(ownerId)
    .toArray();
  return records.map((record) => record.payload);
}

export interface LocalSyncSummary {
  pending: number;
  processing: number;
  failed: number;
  conflict: number;
  rejected: number;
  synced: number;
  openConflicts: number;
}

export async function getLocalSyncSummary(ownerId: string): Promise<LocalSyncSummary> {
  const operations = await listQueueOperations(ownerId);
  const conflicts = await fieldmarkLocalDb.sync_conflicts
    .where('user_id')
    .equals(ownerId)
    .filter((record) => record.status === 'OPEN')
    .count();

  return {
    pending: operations.filter((operation) => operation.status === 'PENDING').length,
    processing: operations.filter((operation) => operation.status === 'PROCESSING').length,
    failed: operations.filter((operation) => operation.status === 'FAILED').length,
    conflict: operations.filter((operation) => operation.status === 'CONFLICT').length,
    rejected: operations.filter((operation) => operation.status === 'REJECTED').length,
    synced: operations.filter((operation) => operation.status === 'SYNCED').length,
    openConflicts: conflicts,
  };
}

/** Store both sides of a conflict for later resolution. */
export async function recordSyncConflict(input: {
  userId: string;
  operationId: string;
  entityType: string;
  entityId: string;
  localSnapshot: unknown;
  serverSnapshot: unknown;
  conflictType: string;
}): Promise<void> {
  assertOwner(input.userId);
  await fieldmarkLocalDb.transaction('rw', fieldmarkLocalDb.sync_conflicts, async () => {
    const existing = await fieldmarkLocalDb.sync_conflicts
      .where('operation_id')
      .equals(input.operationId)
      .first();
    if (existing) {
      return;
    }
    await fieldmarkLocalDb.sync_conflicts.put({
      id: createId(),
      user_id: input.userId,
      operation_id: input.operationId,
      server_conflict_id: null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      local_snapshot: input.localSnapshot,
      server_snapshot: input.serverSnapshot,
      conflict_type: input.conflictType,
      status: 'OPEN',
      created_at: timestamp(),
      resolved_at: null,
    });
  });
}

/** Test-only helper: remove every local record without touching the database schema. */
export async function clearAllLocalData(): Promise<void> {
  await fieldmarkLocalDb.transaction(
    'rw',
    [
      fieldmarkLocalDb.local_users,
      fieldmarkLocalDb.local_sites,
      fieldmarkLocalDb.local_inspections,
      fieldmarkLocalDb.local_checklist_templates,
      fieldmarkLocalDb.local_inspection_answers,
      fieldmarkLocalDb.sync_queue,
      fieldmarkLocalDb.sync_metadata,
      fieldmarkLocalDb.sync_conflicts,
    ],
    async () => {
      await Promise.all([
        fieldmarkLocalDb.local_users.clear(),
        fieldmarkLocalDb.local_sites.clear(),
        fieldmarkLocalDb.local_inspections.clear(),
        fieldmarkLocalDb.local_checklist_templates.clear(),
        fieldmarkLocalDb.local_inspection_answers.clear(),
        fieldmarkLocalDb.sync_queue.clear(),
        fieldmarkLocalDb.sync_metadata.clear(),
        fieldmarkLocalDb.sync_conflicts.clear(),
      ]);
    },
  );
}
