import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIELDMARK_LOCAL_DB_NAME, fieldmarkLocalDb } from '@/db/fieldmarkDb';
import {
  assertOfflineAccessAllowed,
  clearAllLocalData,
  countQueueOperations,
  ensureLocalAccount,
  getLocalInspectionDetail,
  getLocalSyncSummary,
  getSyncMetadata,
  listLocalInspections,
  listLocalSites,
  listLocalTemplates,
  markAnswerConfirmed,
  markQueueStatus,
  queueAnswerChange,
  queueInspectionStart,
  queueInspectionSubmission,
  recordSyncConflict,
  saveDownloadedInspectionDetail,
  saveDownloadedInspectionSummaries,
  saveLocalDraft,
} from '@/db/localRepositories';
import { OfflinePersistenceError, normalizeOfflineError } from '@/db/localTypes';
import {
  hydrateInspectionDraft,
  persistInspectionDraft,
  readInspectionDraft,
  removeInspectionDraft,
  inspectionDraftKey,
  useInspectionDraftStore,
} from '@/features/inspections/store/inspectionDraftStore';
import { createStoredDraft } from '@/features/inspections/types/inspectionWorkflow';
import {
  inspectionDetailFixture,
  inspectionFixture,
  inspectorCurrentUser,
  userFixture,
} from '@/test/fixtures';

const ownerId = inspectorCurrentUser.id;
const otherOwnerId = 'inspector-2';

beforeEach(async () => {
  await clearAllLocalData();
  useInspectionDraftStore.setState({ drafts: {} });
  await ensureLocalAccount(inspectorCurrentUser);
});

describe('Dexie local database', () => {
  it('defines all approved tables with the expected database name', () => {
    expect(fieldmarkLocalDb.name).toBe(FIELDMARK_LOCAL_DB_NAME);
    expect(fieldmarkLocalDb.tables.map((table) => table.name).sort()).toEqual(
      [
        'local_checklist_templates',
        'local_inspection_answers',
        'local_inspections',
        'local_sites',
        'local_users',
        'sync_conflicts',
        'sync_metadata',
        'sync_queue',
      ].sort(),
    );
    expect(fieldmarkLocalDb.verno).toBe(1);
  });

  it('records bounded offline access without storing credentials', async () => {
    const account = await fieldmarkLocalDb.local_users.get(ownerId);
    expect(account?.server_user_id).toBe(ownerId);
    expect(account?.email).toBe(inspectorCurrentUser.email);
    expect(new Date(account?.offline_access_expires_at ?? 0).getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(account)).not.toContain('password');
    expect(JSON.stringify(account)).not.toContain('refresh_token');
  });

  it('rejects offline access for an unknown or anonymous account', async () => {
    await expect(assertOfflineAccessAllowed(otherOwnerId)).rejects.toMatchObject({
      code: 'OFFLINE_SESSION_MISSING',
    });
    await expect(assertOfflineAccessAllowed('anonymous')).rejects.toMatchObject({
      code: 'OFFLINE_OWNER_REQUIRED',
    });
    expect(normalizeOfflineError(new OfflinePersistenceError('blocked', 'TEST'))).toBe('blocked');
  });

  it('surfaces IndexedDB write failures instead of reporting a false success', async () => {
    const put = vi
      .spyOn(fieldmarkLocalDb.local_inspections, 'put')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));
    const draft = createStoredDraft(inspectionDetailFixture, ownerId);

    try {
      await expect(saveLocalDraft(ownerId, inspectionFixture.id, draft)).rejects.toThrow(
        'QuotaExceededError',
      );
      expect(normalizeOfflineError(new Error('QuotaExceededError'))).toBe(
        'Local storage error: QuotaExceededError',
      );
    } finally {
      put.mockRestore();
    }
  });
});

describe('offline inspection cache', () => {
  it('stores a complete inspection, checklist, site, and answers offline', async () => {
    await saveDownloadedInspectionDetail(ownerId, inspectionDetailFixture);

    const detail = await getLocalInspectionDetail(ownerId, inspectionFixture.id);
    expect(detail?.id).toBe(inspectionFixture.id);
    expect(detail?.checklist_items).toHaveLength(inspectionDetailFixture.checklist_items.length);
    expect(await listLocalSites(ownerId)).toHaveLength(1);
    expect(await listLocalTemplates(ownerId)).toHaveLength(1);

    const template = await fieldmarkLocalDb.local_checklist_templates.toArray();
    expect(template[0].revision).toBe(inspectionDetailFixture.template.template_version);
  });

  it('caches downloaded summaries and isolates data by account', async () => {
    await saveDownloadedInspectionSummaries(ownerId, [inspectionFixture]);
    await saveDownloadedInspectionDetail(ownerId, inspectionDetailFixture);

    expect((await listLocalInspections(ownerId)).map((item) => item.id)).toContain(inspectionFixture.id);
    expect(await listLocalInspections(otherOwnerId)).toEqual([]);
    // Reading another account's offline cache requires that account's offline
    // session, so cross-account access is rejected before any data is returned.
    await expect(getLocalInspectionDetail(otherOwnerId, inspectionFixture.id)).rejects.toMatchObject({
      code: 'OFFLINE_SESSION_MISSING',
    });
  });

  it('does not let another account read or clear the first account’s draft', async () => {
    await saveDownloadedInspectionDetail(ownerId, inspectionDetailFixture);
    const draft = createStoredDraft(inspectionDetailFixture, ownerId);
    draft.values.answers['item-text'] = 'Private note';
    await persistInspectionDraft(draft);

    expect(readInspectionDraft(inspectionDraftKey(ownerId, inspectionFixture.id))?.values.answers['item-text']).toBe(
      'Private note',
    );

    useInspectionDraftStore.setState({ drafts: {} });
    const restored = await hydrateInspectionDraft(ownerId, inspectionFixture.id);
    expect(restored?.values.answers['item-text']).toBe('Private note');

    await expect(hydrateInspectionDraft(otherOwnerId, inspectionFixture.id)).rejects.toMatchObject({
      code: 'OFFLINE_SESSION_MISSING',
    });
  });
});

describe('durable answer and operation queue', () => {
  const answerId = 'answer-yes-no';

  it('persists an answer and its queue operation atomically with a stable ID', async () => {
    const first = await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-yes-no',
      answerId,
      value: true,
      notes: '',
      baseVersion: 1,
    });
    const answer = await fieldmarkLocalDb.local_inspection_answers.get(`${ownerId}:${answerId}`);
    expect(answer?.value).toBe(true);
    expect(answer?.operation_id).toBe(first.id);
    expect(await countQueueOperations(ownerId, ['PENDING'])).toBe(1);

    const second = await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-yes-no',
      answerId,
      value: true,
      notes: 'updated remark',
      baseVersion: 1,
    });
    expect(second.id).toBe(first.id);
    expect(second.payload_hash).not.toBe(first.payload_hash);
    expect(await countQueueOperations(ownerId, ['PENDING'])).toBe(1);
  });

  it('does not mutate an operation that has already been sent', async () => {
    const sent = await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-yes-no',
      answerId,
      value: true,
      notes: '',
      baseVersion: 1,
    });
    await markAnswerConfirmed(ownerId, answerId, 2);
    expect((await fieldmarkLocalDb.sync_queue.get(sent.id))?.status).toBe('SYNCED');

    const newer = await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-yes-no',
      answerId,
      value: false,
      notes: '',
      baseVersion: 2,
    });
    expect(newer.id).not.toBe(sent.id);
    expect(newer.operation_type).toBe('UPDATE');
    expect(newer.base_version).toBe(2);
    expect((await fieldmarkLocalDb.sync_queue.get(sent.id))?.payload).toEqual(sent.payload);
  });

  it('keeps start and submit operation IDs stable across retries', async () => {
    await saveDownloadedInspectionDetail(ownerId, inspectionDetailFixture);
    const startId = await queueInspectionStart(ownerId, inspectionDetailFixture);
    expect(await queueInspectionStart(ownerId, inspectionDetailFixture)).toBe(startId);

    const submitId = await queueInspectionSubmission(
      ownerId,
      inspectionDetailFixture,
      'submission-1',
      'All clear',
      'PASS',
    );
    expect(await queueInspectionSubmission(ownerId, inspectionDetailFixture, 'submission-1', 'All clear', 'PASS')).toBe(
      submitId,
    );

    const record = await fieldmarkLocalDb.local_inspections.get(`${ownerId}:${inspectionFixture.id}`);
    expect(record?.status).toBe('SUBMITTED');
    expect(record?.sync_status).toBe('pending');
  });

  it('stores conflict snapshots and reports sync status counts', async () => {
    const operation = await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-yes-no',
      answerId,
      value: true,
      notes: '',
      baseVersion: 1,
    });
    await markQueueStatus(operation.id, 'CONFLICT');
    await recordSyncConflict({
      userId: ownerId,
      operationId: operation.id,
      entityType: 'inspection_answer',
      entityId: answerId,
      localSnapshot: { value: true },
      serverSnapshot: { value: false },
      conflictType: 'VERSION_CONFLICT',
    });

    const summary = await getLocalSyncSummary(ownerId);
    expect(summary.conflict).toBe(1);
    expect(summary.openConflicts).toBe(1);
    expect(await getSyncMetadata<string>(ownerId, 'device_id')).toBeTruthy();
  });
});

describe('browser refresh and restart', () => {
  it('keeps drafts and queue operations after the database is reopened', async () => {
    await saveDownloadedInspectionDetail(ownerId, inspectionDetailFixture);
    const draft = createStoredDraft(inspectionDetailFixture, ownerId);
    draft.values.answers['item-text'] = 'Survives restart';
    await persistInspectionDraft(draft);
    await queueAnswerChange({
      ownerId,
      inspectionId: inspectionFixture.id,
      checklistItemId: 'item-text',
      answerId: 'answer-text',
      value: 'Survives restart',
      notes: '',
      baseVersion: 1,
    });

    await fieldmarkLocalDb.close();
    await fieldmarkLocalDb.open();
    useInspectionDraftStore.setState({ drafts: {} });

    const restored = await hydrateInspectionDraft(ownerId, inspectionFixture.id);
    expect(restored?.values.answers['item-text']).toBe('Survives restart');
    const restoredDetail = await getLocalInspectionDetail(ownerId, inspectionFixture.id);
    expect(
      restoredDetail?.answers.some((answer) => answer.checklist_item_id === 'item-text'),
    ).toBe(true);
    expect(await countQueueOperations(ownerId, ['PENDING'])).toBe(1);
    expect(await removeInspectionDraft(ownerId, inspectionFixture.id)).toBeUndefined();
    expect(await hydrateInspectionDraft(ownerId, inspectionFixture.id)).toBeNull();
    expect(userFixture.id).toBe(ownerId);
  });
});
