import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  clearAllLocalData,
  ensureLocalAccount,
  listQueueOperations,
  queueAnswerChange,
} from '@/db/localRepositories';
import { fieldmarkLocalDb } from '@/db/fieldmarkDb';
import { conflictApi } from '@/services/api/conflictApi';
import { useAuthStore } from '@/store/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SyncCenterPage } from '@/features/sync/pages/SyncCenterPage';
import { currentUser, detail } from '@/services/sync/syncTestFixtures';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock('@/services/api/conflictApi', () => ({ conflictApi: api }));
vi.mock('@/services/sync/syncEngine', () => ({ syncNow: vi.fn() }));

const SERVER_CONFLICT_ID = '11111111-2222-4333-8444-555555555555';
const ANSWER_ID = '44444444-4444-4444-8444-444444444444';
const CHECKLIST_ITEM_ID = '55555555-5555-4555-8555-555555555555';

let conflictOpen = true;

function summary(operationId: string) {
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
    ...summary(operationId),
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

async function seedConflict(): Promise<string> {
  const operation = await queueAnswerChange({
    ownerId: currentUser.id,
    inspectionId: detail.id,
    checklistItemId: CHECKLIST_ITEM_ID,
    answerId: ANSWER_ID,
    value: false,
    notes: 'local observation',
    baseVersion: 1,
  });
  const data = remoteDetail(operation.id);
  await fieldmarkLocalDb.sync_conflicts.put({
    id: '99999999-aaaa-4bbb-8ccc-dddddddddddd',
    user_id: currentUser.id,
    operation_id: operation.id,
    server_conflict_id: SERVER_CONFLICT_ID,
    entity_type: 'inspection_answer',
    entity_id: ANSWER_ID,
    local_snapshot: { payload: data.local_payload, base_version: 1 },
    server_snapshot: { payload: data.server_payload, server_version: 2 },
    conflict_type: 'VERSION_CONFLICT',
    status: 'OPEN',
    created_at: data.created_at,
    resolved_at: null,
  });

  conflictOpen = true;
  api.list.mockImplementation(async () => ({ data: conflictOpen ? [summary(operation.id)] : [] }));
  api.detail.mockImplementation(async () => data);
  api.resolve.mockImplementation(async () => {
    conflictOpen = false;
    return {
      conflict_id: SERVER_CONFLICT_ID,
      status: 'RESOLVED',
      resolution_type: 'KEEP_SERVER',
      resolved_at: '2026-11-22T11:00:00.000Z',
    };
  });
  return operation.id;
}

beforeEach(async () => {
  await clearAllLocalData();
  await ensureLocalAccount(currentUser);
  useAuthStore.getState().setAuthenticated(currentUser);
  api.list.mockReset();
  api.detail.mockReset();
  api.resolve.mockReset();
  conflictOpen = true;
});

describe('Sync Center conflicts', () => {
  it('preserves both snapshots and requires explicit confirmation to accept the server version', async () => {
    const operationId = await seedConflict();
    const user = userEvent.setup();
    renderWithProviders(<SyncCenterPage />);

    expect((await screen.findAllByText('inspection_answer')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByText('local observation')).toBeInTheDocument();
    expect(screen.getByText('server observation')).toBeInTheDocument();
    const acceptButton = screen.getByRole('button', { name: 'Accept server version' });
    expect(acceptButton).toBeDisabled();

    await user.click(screen.getByRole('checkbox'));
    expect(acceptButton).toBeEnabled();
    await user.click(acceptButton);

    await waitFor(() => {
      expect(conflictApi.resolve).toHaveBeenCalledWith(SERVER_CONFLICT_ID, {
        resolution_type: 'KEEP_SERVER',
        expected_server_version: 2,
      });
    });
    await waitFor(async () => {
      const conflicts = await fieldmarkLocalDb.sync_conflicts.toArray();
      expect(conflicts[0]).toMatchObject({
        status: 'RESOLVED',
        resolution_type: 'KEEP_SERVER',
        server_conflict_id: SERVER_CONFLICT_ID,
      });
    });
    const operations = await listQueueOperations(currentUser.id);
    expect(operations.find((item) => item.id === operationId)?.status).toBe('CANCELLED');

    await user.click(await screen.findByRole('button', { name: 'History' }));
    expect(await screen.findByText('Resolution history')).toBeInTheDocument();
    expect(screen.getByText(/KEEP_SERVER by/)).toBeInTheDocument();
  });

  it('queues a version-checked operation when keeping the local version', async () => {
    const operationId = await seedConflict();
    const user = userEvent.setup();
    renderWithProviders(<SyncCenterPage />);

    await user.click(await screen.findByRole('button', { name: 'Review' }));
    await user.click(await screen.findByRole('button', { name: 'Keep local version' }));

    await waitFor(() => {
      expect(conflictApi.resolve).toHaveBeenCalledWith(SERVER_CONFLICT_ID, {
        resolution_type: 'KEEP_LOCAL',
        expected_server_version: 2,
      });
    });
    await waitFor(async () => {
      const operations = await listQueueOperations(currentUser.id);
      const resolution = operations.find(
        (item) => item.status === 'PENDING' && item.id !== operationId,
      );
      expect(resolution).toBeDefined();
      expect(resolution?.base_version).toBe(2);
      expect(resolution?.payload).toMatchObject({ answer_value: false, notes: 'local observation' });
      expect(resolution?.dependencies).toContain(operationId);
    });
  });

  it('queues an explicitly merged answer and hides administrative resolution from inspectors', async () => {
    await seedConflict();
    const user = userEvent.setup();
    renderWithProviders(<SyncCenterPage />);

    await user.click(await screen.findByRole('button', { name: 'Review' }));
    expect(screen.queryByRole('button', { name: 'Apply administrative resolution' })).toBeNull();

    await user.clear(screen.getByLabelText('Corrected answer'));
    await user.type(screen.getByLabelText('Corrected answer'), 'corrected value');
    await user.click(screen.getByRole('button', { name: 'Submit manual resolution' }));

    await waitFor(() => {
      expect(conflictApi.resolve).toHaveBeenCalledWith(SERVER_CONFLICT_ID, {
        resolution_type: 'MANUAL_MERGE',
        expected_server_version: 2,
      });
    });
    await waitFor(async () => {
      const operations = await listQueueOperations(currentUser.id);
      expect(
        operations.some(
          (item) => item.payload.answer_value === 'corrected value' && item.base_version === 2,
        ),
      ).toBe(true);
    });
  });

  it('offers administrative resolution only to administrators', async () => {
    await seedConflict();
    const admin = { ...currentUser, id: 'admin-id', role: 'ADMIN' as const };
    useAuthStore.getState().setAuthenticated(admin);
    await ensureLocalAccount(admin);
    const user = userEvent.setup();
    renderWithProviders(<SyncCenterPage />);

    await user.click(await screen.findByRole('button', { name: 'Review' }));
    const button = await screen.findByRole('button', { name: 'Apply administrative resolution' });
    expect(button).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(button).toBeEnabled();
  });
});
