import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  clearAllLocalData,
  countQueueOperations,
  ensureLocalAccount,
  saveDownloadedInspectionDetail,
} from '@/db/localRepositories';
import { useAuthStore } from '@/store/authStore';
import { renderWithProviders } from '@/test/renderWithProviders';
import {
  inspectionDetailFixture,
  inspectionFixture,
  inspectorCurrentUser,
  paginationFixture,
  siteFixture,
  templateFixture,
} from '@/test/fixtures';
import { ExecuteInspectionPage } from '@/features/inspections/pages/ExecuteInspectionPage';
import { InspectionDetailsPage } from '@/features/inspections/pages/InspectionDetailsPage';
import { MyInspectionsPage } from '@/features/inspections/pages/MyInspectionsPage';
import { useInspectionDraftStore } from '@/features/inspections/store/inspectionDraftStore';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  start: vi.fn(),
  saveAnswer: vi.fn(),
  submit: vi.fn(),
  listSites: vi.fn(),
  listChecklists: vi.fn(),
}));

vi.mock('@/services/api/inspectionsApi', () => ({
  inspectionsApi: {
    list: api.list,
    detail: api.detail,
    start: api.start,
    saveAnswer: api.saveAnswer,
    submit: api.submit,
  },
}));
vi.mock('@/services/api/sitesApi', () => ({ sitesApi: { list: api.listSites } }));
vi.mock('@/services/api/checklistsApi', () => ({ checklistsApi: { list: api.listChecklists } }));

const executionRoute = '/inspector/inspections/inspection-1/execute';

function setOnline(online: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
}

async function fillRequiredAnswers(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByLabelText('Yes'));
  await user.type(screen.getByLabelText('How many extinguishers were checked?'), '4');
  await user.selectOptions(screen.getByLabelText('Was the alarm panel operational?'), 'Operational');
}

beforeEach(async () => {
  vi.clearAllMocks();
  setOnline(true);
  await clearAllLocalData();
  await ensureLocalAccount(inspectorCurrentUser);
  useAuthStore.setState({ user: inspectorCurrentUser, status: 'authenticated' });
  useInspectionDraftStore.setState({ drafts: {} });

  api.list.mockResolvedValue({ data: [inspectionFixture], pagination: paginationFixture });
  api.detail.mockResolvedValue({ ...inspectionDetailFixture, status: 'IN_PROGRESS' });
  api.saveAnswer.mockResolvedValue({
    id: 'answer-1',
    inspection_id: inspectionFixture.id,
    checklist_item_id: 'item-1',
    answer_value: true,
    notes: '',
    version: 2,
  });
  api.listSites.mockResolvedValue({ data: [siteFixture], pagination: paginationFixture });
  api.listChecklists.mockResolvedValue({ data: [templateFixture], pagination: paginationFixture });
});

afterEach(() => {
  setOnline(true);
});

describe('offline persistence in inspector workflows', () => {
  it('keeps a downloaded inspection available when the API is unreachable', async () => {
    const user = userEvent.setup();
    const detailsRender = renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id" element={<InspectionDetailsPage />} />
      </Routes>,
      { route: '/inspector/inspections/inspection-1' },
    );

    await user.click(await screen.findByRole('button', { name: 'Make available offline' }));
    expect(await screen.findByText('Available offline on this device')).toBeInTheDocument();
    detailsRender.unmount();

    setOnline(false);
    api.list.mockRejectedValue(new Error('network unavailable'));
    renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections" element={<MyInspectionsPage />} />
      </Routes>,
      { route: '/inspector/inspections' },
    );

    expect(
      await screen.findByText('Offline — showing inspections downloaded to this device.'),
    ).toBeInTheDocument();
    expect(await screen.findByText(inspectionFixture.title)).toBeInTheDocument();
    // Offline mode reads only the local cache; no list request is attempted.
    expect(api.list).not.toHaveBeenCalled();
  });

  it('starts a downloaded inspection offline without calling the API', async () => {
    const user = userEvent.setup();
    api.detail.mockResolvedValue(inspectionDetailFixture);
    const detailsRender = renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id" element={<InspectionDetailsPage />} />
      </Routes>,
      { route: '/inspector/inspections/inspection-1' },
    );

    await user.click(await screen.findByRole('button', { name: 'Make available offline' }));
    expect(await screen.findByText('Available offline on this device')).toBeInTheDocument();
    detailsRender.unmount();

    setOnline(false);
    api.start.mockRejectedValue(new Error('network unavailable'));
    renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id" element={<InspectionDetailsPage />} />
      </Routes>,
      { route: '/inspector/inspections/inspection-1' },
    );

    await user.click(await screen.findByRole('button', { name: 'Start inspection' }));
    expect(await screen.findByText('Inspection started offline')).toBeInTheDocument();
    expect(api.start).not.toHaveBeenCalled();
    await waitFor(async () =>
      expect(await countQueueOperations(inspectorCurrentUser.id, ['PENDING'])).toBeGreaterThanOrEqual(1),
    );
  });

  it('saves answers offline to the durable queue without server confirmation', async () => {
    const user = userEvent.setup();
    await saveDownloadedInspectionDetail(inspectorCurrentUser.id, {
      ...inspectionDetailFixture,
      status: 'IN_PROGRESS',
    });
    setOnline(false);

    const firstRender = renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id/execute" element={<ExecuteInspectionPage />} />
      </Routes>,
      { route: executionRoute },
    );

    expect(await screen.findByRole('heading', { name: 'Execute inspection' })).toBeInTheDocument();
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    await fillRequiredAnswers(user);
    await user.type(screen.getByLabelText('Describe any concerns'), 'Offline answer');
    await user.selectOptions(screen.getByLabelText('Overall result'), 'PASS');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Saved on this device — queued for synchronization')).toBeInTheDocument();
    expect(api.saveAnswer).not.toHaveBeenCalled();
    await waitFor(async () =>
      expect(await countQueueOperations(inspectorCurrentUser.id, ['PENDING'])).toBeGreaterThanOrEqual(3),
    );

    firstRender.unmount();
    renderWithProviders(
      <Routes>
        <Route path="/inspector/inspections/:id/execute" element={<ExecuteInspectionPage />} />
      </Routes>,
      { route: executionRoute },
    );

    expect(await screen.findByLabelText('Describe any concerns')).toHaveValue('Offline answer');

    await user.click(screen.getByRole('button', { name: 'Submit inspection' }));
    expect(await screen.findByText('Submission saved offline')).toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
    await waitFor(async () =>
      expect(await countQueueOperations(inspectorCurrentUser.id, ['PENDING'])).toBeGreaterThanOrEqual(4),
    );
  });
});
