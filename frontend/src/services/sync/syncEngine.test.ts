import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAllLocalData,
  ensureLocalAccount,
  getSyncMetadata,
  listQueueOperations,
  queueAnswerChange,
  queueInspectionStart,
  queueInspectionSubmission,
  saveDownloadedInspectionDetail,
  setSyncMetadata,
} from '@/db/localRepositories';
import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import { ApiError } from '@/lib/error';
import { syncNow } from '@/services/sync/syncEngine';
import type {
  PushResult,
  SyncOperationRequest,
} from '@/services/sync/syncTypes';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import {
  currentUser,
  DEVICE_ID,
  detail,
  OTHER_USER_ID,
  SUBMISSION_ID,
} from '@/services/sync/syncTestFixtures';

const ANSWER_ID = '99999999-9999-4999-8999-999999999999';
const CHECKLIST_ITEM_ID = '55555555-5555-4555-8555-555555555555';

const api = vi.hoisted(() => ({
  registerDevice: vi.fn(),
  push: vi.fn(),
  pull: vi.fn(),
  status: vi.fn(),
}));

vi.mock('@/services/api/syncApi', () => ({ syncApi: api }));

function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

function acceptedResults(operations: SyncOperationRequest[]): { results: PushResult[] } {
  return {
    results: operations.map((operation) => ({
      operation_id: operation.operation_id,
      status: 'ACCEPTED' as const,
      entity_id: operation.entity_id,
      base_version: operation.base_version,
      server_version:
        operation.entity_type === 'inspection' && operation.operation_type === 'SUBMIT' ? 3 : 2,
      message: 'Operation synchronized successfully',
    })),
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  setOnline(true);
  await clearAllLocalData();
  await ensureLocalAccount(currentUser);
  useAuthStore.setState({ user: currentUser, status: 'authenticated' });
  useSyncStore.getState().reset();
  await setSyncMetadata(currentUser.id, 'server_device_id', DEVICE_ID);

  api.status.mockResolvedValue({
    device_id: DEVICE_ID,
    is_active: true,
    last_seen_at: null,
    open_conflicts: 0,
  });
  api.push.mockImplementation(async (_deviceId: string, operations: SyncOperationRequest[]) =>
    acceptedResults(operations),
  );
  api.pull.mockResolvedValue({
    changes: [],
    next_cursor: 'cursor-1',
    has_more: false,
  });
  api.registerDevice.mockResolvedValue({
    id: DEVICE_ID,
    device_name: 'Fieldmark browser',
    is_active: true,
    created_at: new Date().toISOString(),
  });
});

describe('foreground synchronization engine', () => {
  it('pushes dependent operations in order, stores results, and persists the pull cursor', async () => {
    await saveDownloadedInspectionDetail(currentUser.id, detail);
    const start = await queueInspectionStart(currentUser.id, detail);
    const answer = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: '',
      baseVersion: 1,
    });
    const submissionId = await queueInspectionSubmission(
      currentUser.id,
      detail,
      SUBMISSION_ID,
      'All clear',
      'PASS',
    );
    const submission = await fieldmarkLocalDb.sync_queue.get(submissionId);

    expect(answer.dependencies).toContain(start);
    expect(submission?.dependencies).toEqual(expect.arrayContaining([start, answer.id]));
    expect(submission?.base_version).toBe(2);

    const result = await syncNow({ reason: 'manual' });

    expect(result.status).toBe('success');
    expect(result.accepted).toBe(3);
    const batches = api.push.mock.calls.map((call) => call[1] as SyncOperationRequest[]);
    expect(batches.map((batch) => batch.map((operation) => operation.operation_id))).toEqual([
      [start],
      [answer.id],
      [submissionId],
    ]);
    expect((batches[0][0] as unknown as Record<string, unknown>).payload_hash).toBeUndefined();
    expect(await getSyncMetadata<string>(currentUser.id, 'pull_cursor')).toBe('cursor-1');

    const operations = await listQueueOperations(currentUser.id);
    expect(operations.every((operation) => operation.status === 'SYNCED')).toBe(true);
    expect(
      (await fieldmarkLocalDb.local_inspections.get(`${currentUser.id}:${detail.id}`))?.status,
    ).toBe('SUBMITTED');

    const pushCallsAfterFirstRun = api.push.mock.calls.length;
    const repeat = await syncNow({ reason: 'scheduled' });
    expect(repeat.status).toBe('success');
    expect(api.push).toHaveBeenCalledTimes(pushCallsAfterFirstRun);
  });

  it('keeps the same operation ID across a temporary failure and manual retry', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: '',
      baseVersion: 1,
    });

    api.push.mockRejectedValueOnce(
      new ApiError({
        code: 'RATE_LIMITED',
        message: 'Too many requests.',
        status: 429,
        retryAfterHeader: '1',
      }),
    );

    const failed = await syncNow({ reason: 'manual' });
    expect(failed.status).toBe('failed');
    const stored = (await listQueueOperations(currentUser.id)).find((item) => item.id === operation.id);
    expect(stored?.status).toBe('FAILED');
    expect(new Date(stored?.next_retry_at ?? 0).getTime()).toBeGreaterThan(Date.now());

    const retried = await syncNow({ reason: 'manual', force: true });
    expect(retried.status).toBe('success');
    const secondBatch = api.push.mock.calls[1][1] as SyncOperationRequest[];
    expect(secondBatch[0].operation_id).toBe(operation.id);
    expect((await listQueueOperations(currentUser.id))[0].status).toBe('SYNCED');
  });

  it('stops automatic retries after a permanent transport failure', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: '',
      baseVersion: 1,
    });

    api.push.mockRejectedValueOnce(
      new ApiError({ code: 'VALIDATION_ERROR', message: 'Malformed request.', status: 422 }),
    );

    const first = await syncNow({ reason: 'manual' });
    expect(first.status).toBe('failed');
    expect((await listQueueOperations(currentUser.id))[0].status).toBe('REJECTED');

    await syncNow({ reason: 'scheduled' });
    expect(api.push).toHaveBeenCalledTimes(1);
    expect((await listQueueOperations(currentUser.id))[0].id).toBe(operation.id);
  });

  it('does not allow concurrent triggers to process the same queue', async () => {
    await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: '',
      baseVersion: 1,
    });

    let releasePush: ((value: { results: PushResult[] }) => void) | undefined;
    api.push.mockImplementation(
      () =>
        new Promise<{ results: PushResult[] }>((resolve) => {
          releasePush = resolve;
        }),
    );

    const first = syncNow({ reason: 'online' });
    const second = syncNow({ reason: 'manual' });
    await vi.waitFor(() => expect(releasePush).toBeDefined());
    expect(api.push).toHaveBeenCalledTimes(1);

    releasePush?.({ results: [] });
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.status).toBe('partial');
    expect(secondResult.status).toBe('skipped');
    expect(secondResult.message).toBe('Synchronization is already running.');
  });

  it('pushes only the authenticated account’s operations', async () => {
    await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: 'mine',
      baseVersion: 1,
    });
    const other = await queueAnswerChange({
      ownerId: OTHER_USER_ID,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: 'aaaaaa99-aaaa-4aaa-8aaa-aaaaaaaaaa99',
      value: false,
      notes: 'theirs',
      baseVersion: 1,
    });

    await syncNow({ reason: 'manual' });

    const pushedIds = (api.push.mock.calls[0][1] as SyncOperationRequest[]).map(
      (operation) => operation.operation_id,
    );
    expect(pushedIds).not.toContain(other.id);
    expect((await listQueueOperations(currentUser.id))[0].status).toBe('SYNCED');
    expect((await listQueueOperations(OTHER_USER_ID))[0].status).toBe('PENDING');
  });
});
