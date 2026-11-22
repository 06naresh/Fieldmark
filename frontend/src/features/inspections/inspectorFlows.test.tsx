import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/store/authStore';
import { clearAllLocalData, ensureLocalAccount } from '@/db/localRepositories';
import { renderWithProviders } from '@/test/renderWithProviders';
import {
  inspectionDetailFixture,
  inspectionFixture,
  inspectorCurrentUser,
  paginationFixture,
  siteFixture,
  submittedResultFixture,
  templateFixture,
} from '@/test/fixtures';
import { ExecuteInspectionPage } from '@/features/inspections/pages/ExecuteInspectionPage';
import { InspectionDetailsPage } from '@/features/inspections/pages/InspectionDetailsPage';
import { MyInspectionsPage } from '@/features/inspections/pages/MyInspectionsPage';
import {
  inspectionDraftKey,
  readInspectionDraft,
  useInspectionDraftStore,
} from '@/features/inspections/store/inspectionDraftStore';

const api = vi.hoisted(() => ({
  listInspections: vi.fn(),
  detail: vi.fn(),
  start: vi.fn(),
  saveAnswer: vi.fn(),
  submit: vi.fn(),
  listSites: vi.fn(),
  listChecklists: vi.fn(),
}));

vi.mock('@/services/api/inspectionsApi', () => ({
  inspectionsApi: {
    list: api.listInspections,
    detail: api.detail,
    start: api.start,
    saveAnswer: api.saveAnswer,
    submit: api.submit,
  },
}));

vi.mock('@/services/api/sitesApi', () => ({
  sitesApi: { list: api.listSites },
}));

vi.mock('@/services/api/checklistsApi', () => ({
  checklistsApi: { list: api.listChecklists },
}));

const executionRoute = '/inspector/inspections/inspection-1/execute';
const draftKey = inspectionDraftKey(inspectorCurrentUser.id, inspectionFixture.id);

function renderInspectorRoutes(route: string): void {
  renderWithProviders(
    <Routes>
      <Route path="/inspector/inspections" element={<MyInspectionsPage />} />
      <Route path="/inspector/inspections/:id" element={<InspectionDetailsPage />} />
      <Route path="/inspector/inspections/:id/execute" element={<ExecuteInspectionPage />} />
    </Routes>,
    { route },
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await clearAllLocalData();
  await ensureLocalAccount(inspectorCurrentUser);
  useAuthStore.setState({ user: inspectorCurrentUser, status: 'authenticated' });
  useInspectionDraftStore.setState({ drafts: {} });

  api.listInspections.mockResolvedValue({
    data: [inspectionFixture],
    pagination: paginationFixture,
  });
  api.detail.mockResolvedValue({ ...inspectionDetailFixture, status: 'IN_PROGRESS' });
  api.start.mockResolvedValue({
    id: inspectionFixture.id,
    status: 'IN_PROGRESS',
    version: inspectionFixture.version + 1,
  });
  api.saveAnswer.mockImplementation(
    async (
      inspectionId: string,
      checklistItemId: string,
      payload: { answer_value: unknown; notes: string | null; base_version: number },
    ) => ({
      id: `answer-${checklistItemId}`,
      inspection_id: inspectionId,
      checklist_item_id: checklistItemId,
      answer_value: payload.answer_value,
      notes: payload.notes,
      version: payload.base_version + 1,
    }),
  );
  api.submit.mockResolvedValue({
    result_id: 'result-1',
    inspection_id: inspectionFixture.id,
    submission_number: 1,
    overall_status: 'PASS',
    submitted_at: '2026-11-21T12:00:00Z',
    inspection_status: 'SUBMITTED',
  });
  api.listSites.mockResolvedValue({ data: [siteFixture], pagination: paginationFixture });
  api.listChecklists.mockResolvedValue({ data: [templateFixture], pagination: paginationFixture });
});

async function fillRequiredAnswers(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByLabelText('Yes'));
  await user.type(screen.getByLabelText('How many extinguishers were checked?'), '4');
  await user.selectOptions(screen.getByLabelText('Was the alarm panel operational?'), 'Operational');
}

describe('inspector workflow', () => {
  it('lists assignments and links active inspections to execution', async () => {
    renderInspectorRoutes('/inspector/inspections');

    expect(await screen.findByText(inspectionFixture.title)).toBeInTheDocument();
    const continueLink = screen.getByRole('link', { name: 'Continue' });
    expect(continueLink).toHaveAttribute('href', executionRoute);
  });

  it('starts an assigned inspection from its details page', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue({ ...inspectionDetailFixture, status: 'ASSIGNED' });
    renderInspectorRoutes('/inspector/inspections/inspection-1');

    await user.click(await screen.findByRole('button', { name: 'Start inspection' }));

    await waitFor(() =>
      expect(api.start).toHaveBeenCalledWith(inspectionFixture.id, inspectionFixture.version),
    );
    expect(await screen.findByText('Inspection started')).toBeInTheDocument();
  });

  it('validates required answers, preserves local drafts, and saves answers to the backend', async () => {
    const user = userEvent.setup();
    renderInspectorRoutes(executionRoute);

    expect(await screen.findByRole('heading', { name: 'Execute inspection' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Select an overall result.')).toBeInTheDocument();
    expect(screen.getAllByText('This answer is required.').length).toBeGreaterThan(0);
    expect(api.saveAnswer).not.toHaveBeenCalled();

    await fillRequiredAnswers(user);
    await user.type(screen.getByLabelText('Describe any concerns'), 'Loose cable near door.');
    await user.click(screen.getByLabelText('Warehouse'));
    await user.selectOptions(screen.getByLabelText('Overall result'), 'PASS');

    expect(readInspectionDraft(draftKey)?.values.answers['item-text']).toBe('Loose cable near door.');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(api.saveAnswer).toHaveBeenCalledTimes(5));
    expect(api.saveAnswer).toHaveBeenCalledWith(inspectionFixture.id, 'item-yes-no', {
      answer_value: true,
      notes: '',
      base_version: 1,
    });
    expect(api.saveAnswer).toHaveBeenCalledWith(inspectionFixture.id, 'item-number', {
      answer_value: 4,
      notes: '',
      base_version: 1,
    });
    expect(api.saveAnswer).toHaveBeenCalledWith(inspectionFixture.id, 'item-multiple', {
      answer_value: ['Warehouse'],
      notes: '',
      base_version: 1,
    });
    expect(await screen.findByText('Saved locally and confirmed by server')).toBeInTheDocument();
  });

  it('restores an in-progress draft when the execution page is reopened', async () => {
    const user = userEvent.setup();
    const firstRender = renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id/execute" element={<ExecuteInspectionPage />} />
      </Routes>,
      { route: executionRoute },
    );

    const textAnswer = await screen.findByLabelText('Describe any concerns');
    await user.type(textAnswer, 'Draft survives navigation.');
    expect(readInspectionDraft(draftKey)?.values.answers['item-text']).toBe(
      'Draft survives navigation.',
    );

    // Unmount explicitly to simulate leaving and reopening the execution page.
    firstRender.unmount();

    renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id/execute" element={<ExecuteInspectionPage />} />
      </Routes>,
      { route: executionRoute },
    );

    expect(await screen.findByLabelText('Describe any concerns')).toHaveValue(
      'Draft survives navigation.',
    );
  });

  it('reuses the same submission id when a failed submission is retried', async () => {
    const user = userEvent.setup();
    api.submit
      .mockRejectedValueOnce(new Error('network interrupted'))
      .mockResolvedValueOnce({
        result_id: 'result-1',
        inspection_id: inspectionFixture.id,
        submission_number: 1,
        overall_status: 'PASS',
        submitted_at: '2026-11-21T12:00:00Z',
        inspection_status: 'SUBMITTED',
      });

    renderInspectorRoutes(executionRoute);
    expect(await screen.findByRole('heading', { name: 'Execute inspection' })).toBeInTheDocument();

    await fillRequiredAnswers(user);
    await user.selectOptions(screen.getByLabelText('Overall result'), 'PASS');

    const submissionId = readInspectionDraft(draftKey)?.submissionId;
    expect(submissionId).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Submit inspection' }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: 'Submit inspection' }));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(2));

    expect(api.submit.mock.calls[0][1].submission_id).toBe(submissionId);
    expect(api.submit.mock.calls[1][1].submission_id).toBe(submissionId);
  });

  it('queues a note-only change on an existing answer', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue({
      ...inspectionDetailFixture,
      status: 'IN_PROGRESS',
      answers: [
        {
          id: 'answer-text',
          inspection_id: inspectionFixture.id,
          checklist_item_id: 'item-text',
          answer_value: 'Existing concern',
          notes: 'Old note',
          version: 1,
        },
      ],
    });

    renderInspectorRoutes(executionRoute);
    expect(await screen.findByRole('heading', { name: 'Execute inspection' })).toBeVisible();
    await fillRequiredAnswers(user);

    const notesFields = await screen.findAllByLabelText('Notes');
    await user.clear(notesFields[1]);
    await user.type(notesFields[1], 'Updated note');
    await user.selectOptions(screen.getByLabelText('Overall result'), 'PASS');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() =>
      expect(api.saveAnswer).toHaveBeenCalledWith(inspectionFixture.id, 'item-text', {
        answer_value: 'Existing concern',
        notes: 'Updated note',
        base_version: 1,
      }),
    );
  });

  it('shows saved answers, notes, and the submitted result on inspection details', async () => {
    api.detail.mockResolvedValue({
      ...inspectionDetailFixture,
      status: 'SUBMITTED',
      answers: [
        {
          id: 'answer-yes-no',
          inspection_id: inspectionFixture.id,
          checklist_item_id: 'item-yes-no',
          answer_value: true,
          notes: 'Guard was fitted.',
          version: 1,
        },
      ],
      result: submittedResultFixture,
    });

    renderInspectorRoutes('/inspector/inspections/inspection-1');

    expect(await screen.findByText('Submission #1')).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('All checks completed.')).toBeInTheDocument();
    expect(screen.getByText('Guard was fitted.')).toBeInTheDocument();
  });
});
