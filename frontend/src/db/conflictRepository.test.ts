import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllLocalData,
  ensureLocalAccount,
  listQueueOperations,
  queueAnswerChange,
} from '@/db/localRepositories';
import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import {
  applyResolvedConflictLocally,
  conflictLocalPayload,
  conflictServerPayload,
  conflictServerVersion,
  getLocalConflict,
  hydrateRemoteConflicts,
  retryLocalOperation,
} from '@/db/conflictRepository';
import type { LocalConflictRecord } from '@/db/localTypes';
import { currentUser, detail } from '@/services/sync/syncTestFixtures';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('@/services/api/conflictApi', () => ({ conflictApi: api }));

const SERVER_CONFLICT_ID = '11111111-2222-4333-8444-555555555555';
const ANSWER_ID = '44444444-4444-4444-8444-444444444444';
const CHECKLIST_ITEM_ID = '55555555-5555-4555-8555-555555555555';

function remoteSummary(operationId: string) {
  return {
    id: SERVER_CONFLICT_ID,
    operation_id: operationId,
    entity_type: 'inspection_answer',
    entity_id: ANSWER_ID,
    base_version: 1,
    server_version: 2,
    status: 'OPEN' as const,
    resolution_type: null,
    resolved_by: null,
    resolved_at: null,
    created_at: '2026-11-22T10:00:00.000Z',
  };
}

function remoteDetail(operationId: string) {
  return {
    ...remoteSummary(operationId),
    local_payload: {
      inspection_id: detail.id,
      checklist_item_id: CHECKLIST_ITEM_ID,
      answer_value: false,
      notes: 'local observation',
    },
    server_payload: {
      inspection_id: detail.id,
      checklist_item_id: CHECKLIST_ITEM_ID,
      answer_value: true,
      notes: 'server observation',
    },
  };
}

beforeEach(async () => {
  await clearAllLocalData();
  await ensureLocalAccount(currentUser);
  api.list.mockReset();
  api.detail.mockReset();
  api.resolve.mockReset();
});

describe('conflict snapshot helpers', () => {
  it('reads versions and payloads from cached and remote snapshots', () => {
    expect(conflictServerVersion({ server_version: 3, payload: { version: 4 } })).toBe(3);
    expect(conflictServerVersion({ entity_version: 5 })).toBe(5);
    expect(conflictServerVersion({ payload: { version: 6 } })).toBe(6);
    expect(conflictServerVersion(null)).toBeNull();
    expect(conflictLocalPayload({ payload: { answer_value: true } })).toEqual({ answer_value: true });
    expect(conflictServerPayload({ payload: { answer_value: false } })).toEqual({ answer_value: false });
  });
});

describe('remote conflict hydration', () => {
  it('stores the full server conflict and correlates it with the local operation', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: false,
      notes: 'local observation',
      baseVersion: 1,
    });
    api.list.mockResolvedValue({ data: [remoteSummary(operation.id)] });
    api.detail.mockResolvedValue(remoteDetail(operation.id));

    const hydrated = await hydrateRemoteConflicts(currentUser.id);

    expect(hydrated).toBe(1);
    const conflict = (await fieldmarkLocalDb.sync_conflicts.toArray())[0];
    expect(conflict?.operation_id).toBe(operation.id);
    expect(conflict?.server_conflict_id).toBe(SERVER_CONFLICT_ID);
    expect(conflictServerVersion(conflict?.server_snapshot)).toBe(2);
    expect(conflictLocalPayload(conflict?.local_snapshot)).toMatchObject({
      answer_value: false,
      notes: 'local observation',
    });
    expect(conflictServerPayload(conflict?.server_snapshot)).toMatchObject({
      answer_value: true,
      notes: 'server observation',
    });
  });

  it('does not import conflicts that belong to another device account', async () => {
    api.list.mockResolvedValue({ data: [remoteSummary('other-operation')] });
    api.detail.mockResolvedValue(remoteDetail('other-operation'));

    await expect(hydrateRemoteConflicts(currentUser.id)).resolves.toBe(0);
    expect(await fieldmarkLocalDb.sync_conflicts.count()).toBe(0);
  });
});

describe('local resolution application', () => {
  it('preserves snapshots and cancels the stale operation when keeping the server version', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: false,
      notes: 'local observation',
      baseVersion: 1,
    });
    const conflict: LocalConflictRecord = {
      id: '99999999-aaaa-4bbb-8ccc-dddddddddddd',
      user_id: currentUser.id,
      operation_id: operation.id,
      server_conflict_id: SERVER_CONFLICT_ID,
      entity_type: 'inspection_answer',
      entity_id: ANSWER_ID,
      local_snapshot: { payload: remoteDetail(operation.id).local_payload, base_version: 1 },
      server_snapshot: { payload: remoteDetail(operation.id).server_payload, server_version: 2 },
      conflict_type: 'VERSION_CONFLICT',
      status: 'OPEN',
      created_at: remoteSummary(operation.id).created_at,
      resolved_at: null,
    };
    await fieldmarkLocalDb.sync_conflicts.put(conflict);

    await applyResolvedConflictLocally({
      ownerId: currentUser.id,
      conflictId: conflict.id,
      resolutionType: 'KEEP_SERVER',
      resolvedBy: currentUser.id,
      resolvedAt: '2026-11-22T11:00:00.000Z',
      serverConflictId: SERVER_CONFLICT_ID,
    });

    const stored = await getLocalConflict(currentUser.id, conflict.id);
    expect(stored?.status).toBe('RESOLVED');
    expect(stored?.resolution_type).toBe('KEEP_SERVER');
    expect(stored?.resolved_by).toBe(currentUser.id);
    expect(stored?.local_snapshot).toEqual(conflict.local_snapshot);
    expect(stored?.server_snapshot).toEqual(conflict.server_snapshot);
    const queued = (await listQueueOperations(currentUser.id)).find((item) => item.id === operation.id);
    expect(queued?.status).toBe('CANCELLED');
  });

  it('returns a rejected operation to the retry queue', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: false,
      notes: '',
      baseVersion: 1,
    });
    await fieldmarkLocalDb.sync_queue.put({ ...operation, status: 'REJECTED', attempts: 3 });

    await retryLocalOperation(operation.id);

    const stored = (await listQueueOperations(currentUser.id)).find((item) => item.id === operation.id);
    expect(stored).toMatchObject({ status: 'PENDING', attempts: 0, last_error: null });
  });
});
