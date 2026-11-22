import { beforeEach, describe, expect, it } from 'vitest';
import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import {
  clearAllLocalData,
  ensureLocalAccount,
  listQueueOperations,
  queueAnswerChange,
  setSyncMetadata,
} from '@/db/localRepositories';
import {
  applyPullBatch,
  applyPushResults,
  claimOperations,
  getPullCursor,
  recoverInterruptedOperations,
} from '@/db/syncRepositories';
import type { Site } from '@/types/entities';
import { currentUser, detail } from '@/services/sync/syncTestFixtures';

const ANSWER_ID = '44444444-4444-4444-8444-444444444444';
const CHECKLIST_ITEM_ID = '55555555-5555-4555-8555-555555555555';

function sitePayload(version: number): Site {
  return {
    id: detail.site_id,
    name: version === 1 ? 'North Plant' : 'North Plant Renamed',
    site_code: 'NORTH-01',
    address: '1 Industrial Road',
    city: 'Springfield',
    state: 'IL',
    postal_code: '62701',
    country: 'USA',
    description: null,
    is_active: true,
    version,
  };
}

beforeEach(async () => {
  await clearAllLocalData();
  await ensureLocalAccount(currentUser);
});

describe('push result persistence', () => {
  it('applies identical results once and keeps terminal outcomes intact', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: 'confirmed',
      baseVersion: 1,
    });
    await claimOperations([operation.id]);
    const results = [
      {
        operation_id: operation.id,
        status: 'ACCEPTED' as const,
        entity_id: ANSWER_ID,
        base_version: 1,
        server_version: 1,
        message: 'Operation synchronized successfully',
      },
    ];

    const first = await applyPushResults(currentUser.id, [operation], results);
    const second = await applyPushResults(currentUser.id, [operation], results);

    expect(first).toEqual({ accepted: 1, conflicts: 0, rejected: 0, retryable: 0 });
    expect(second).toEqual({ accepted: 0, conflicts: 0, rejected: 0, retryable: 0 });
    const stored = (await listQueueOperations(currentUser.id)).find((item) => item.id === operation.id);
    expect(stored?.status).toBe('SYNCED');
    const answer = await fieldmarkLocalDb.local_inspection_answers.get(
      `${currentUser.id}:${ANSWER_ID}`,
    );
    expect(answer?.sync_status).toBe('synced');
    expect(answer?.server_version).toBe(1);
  });

  it('stores only one conflict snapshot for a duplicated conflict result', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: false,
      notes: '',
      baseVersion: 2,
    });
    await claimOperations([operation.id]);
    const result = {
      operation_id: operation.id,
      status: 'CONFLICT' as const,
      entity_id: ANSWER_ID,
      base_version: 2,
      server_version: 3,
      message: 'The answer has changed.',
    };

    await applyPushResults(currentUser.id, [operation], [result]);
    await applyPushResults(currentUser.id, [operation], [result]);

    expect(await fieldmarkLocalDb.sync_conflicts.count()).toBe(1);
    const stored = (await listQueueOperations(currentUser.id)).find((item) => item.id === operation.id);
    expect(stored?.status).toBe('CONFLICT');
  });

  it('recovers interrupted operations immediately for idempotent replay', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: true,
      notes: '',
      baseVersion: 1,
    });
    await claimOperations([operation.id]);
    expect((await listQueueOperations(currentUser.id))[0].status).toBe('PROCESSING');

    expect(await recoverInterruptedOperations(currentUser.id)).toBe(1);
    expect((await listQueueOperations(currentUser.id))[0].status).toBe('PENDING');
  });
});

describe('pull batch safety', () => {
  it('keeps the previous cursor and local data when any change in the batch fails', async () => {
    await setSyncMetadata(currentUser.id, 'pull_cursor', 'cursor-0');
    const site = sitePayload(1);
    await fieldmarkLocalDb.local_sites.put({
      id: `${currentUser.id}:${site.id}`,
      owner_id: currentUser.id,
      server_id: site.id,
      name: site.name,
      location: site.address,
      status: 'ACTIVE',
      server_version: 1,
      updated_at: new Date().toISOString(),
      payload: site,
    });

    const validChange = {
      change_id: '66666666-6666-4666-8666-666666666666',
      entity_type: 'site',
      entity_id: site.id,
      change_type: 'UPDATE' as const,
      entity_version: 2,
      payload: sitePayload(2) as unknown as Record<string, unknown>,
    };
    const invalidChange = {
      change_id: '77777777-7777-4777-8777-777777777777',
      entity_type: 'inspection',
      entity_id: detail.id,
      change_type: 'UPDATE' as const,
      entity_version: 2,
      payload: { id: detail.id, status: 'INVALID_STATUS' },
    };

    await expect(
      applyPullBatch(currentUser.id, [validChange, invalidChange], 'cursor-1'),
    ).rejects.toThrow('unsupported status');

    expect(await getPullCursor(currentUser.id)).toBe('cursor-0');
    expect(
      (await fieldmarkLocalDb.local_sites.get(`${currentUser.id}:${site.id}`))?.payload.name,
    ).toBe('North Plant');

    const outcome = await applyPullBatch(currentUser.id, [validChange], 'cursor-1');
    expect(outcome.applied).toBe(1);
    expect(await getPullCursor(currentUser.id)).toBe('cursor-1');
    expect(
      (await fieldmarkLocalDb.local_sites.get(`${currentUser.id}:${site.id}`))?.payload.name,
    ).toBe('North Plant Renamed');
  });

  it('records a conflict instead of overwriting an unsynchronized local answer', async () => {
    const operation = await queueAnswerChange({
      ownerId: currentUser.id,
      inspectionId: detail.id,
      checklistItemId: CHECKLIST_ITEM_ID,
      answerId: ANSWER_ID,
      value: 'local answer',
      notes: 'keep me',
      baseVersion: 1,
    });

    const outcome = await applyPullBatch(
      currentUser.id,
      [
        {
          change_id: '88888888-8888-4888-8888-888888888888',
          entity_type: 'inspection_answer',
          entity_id: ANSWER_ID,
          change_type: 'UPDATE',
          entity_version: 2,
          payload: {
            id: ANSWER_ID,
            inspection_id: detail.id,
            checklist_item_id: CHECKLIST_ITEM_ID,
            answer_value: 'server answer',
            notes: 'server note',
            version: 2,
          },
        },
      ],
      'cursor-1',
    );

    expect(outcome.conflicts).toBe(1);
    expect(await getPullCursor(currentUser.id)).toBe('cursor-1');
    const answer = await fieldmarkLocalDb.local_inspection_answers.get(
      `${currentUser.id}:${ANSWER_ID}`,
    );
    expect(answer?.value).toBe('local answer');
    expect(answer?.operation_id).toBe(operation.id);
    expect(
      await fieldmarkLocalDb.sync_conflicts.where('operation_id').equals(`pull:88888888-8888-4888-8888-888888888888`).first(),
    ).toBeTruthy();
  });
});
