import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '@/store/authStore';
import {
  adminUser,
  inspectionFixture,
  paginationFixture,
  siteFixture,
  templateFixture,
  userFixture,
} from '@/test/fixtures';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ChecklistsPage } from '@/features/checklists/pages/ChecklistsPage';
import { InspectionsPage } from '@/features/inspections/pages/InspectionsPage';
import { SitesPage } from '@/features/sites/pages/SitesPage';
import { UsersPage } from '@/features/users/pages/UsersPage';

const api = vi.hoisted(() => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  setUserStatus: vi.fn(),
  listSites: vi.fn(),
  createSite: vi.fn(),
  updateSite: vi.fn(),
  setSiteStatus: vi.fn(),
  listChecklists: vi.fn(),
  createChecklist: vi.fn(),
  createRevision: vi.fn(),
  setChecklistStatus: vi.fn(),
  listInspections: vi.fn(),
  createInspection: vi.fn(),
}));

vi.mock('@/services/api/usersApi', () => ({
  usersApi: {
    list: api.listUsers,
    create: api.createUser,
    update: api.updateUser,
    setStatus: api.setUserStatus,
  },
}));

vi.mock('@/services/api/sitesApi', () => ({
  sitesApi: {
    list: api.listSites,
    create: api.createSite,
    update: api.updateSite,
    setStatus: api.setSiteStatus,
  },
}));

vi.mock('@/services/api/checklistsApi', () => ({
  checklistsApi: {
    list: api.listChecklists,
    create: api.createChecklist,
    createRevision: api.createRevision,
    setStatus: api.setChecklistStatus,
  },
}));

vi.mock('@/services/api/inspectionsApi', () => ({
  inspectionsApi: {
    list: api.listInspections,
    create: api.createInspection,
    update: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: adminUser, status: 'authenticated' });

  api.listUsers.mockResolvedValue({ data: [userFixture], pagination: paginationFixture });
  api.createUser.mockResolvedValue(userFixture);
  api.updateUser.mockResolvedValue(userFixture);
  api.setUserStatus.mockResolvedValue(userFixture);

  api.listSites.mockResolvedValue({ data: [siteFixture], pagination: paginationFixture });
  api.createSite.mockResolvedValue(siteFixture);
  api.updateSite.mockResolvedValue(siteFixture);
  api.setSiteStatus.mockResolvedValue(siteFixture);

  api.listChecklists.mockResolvedValue({ data: [templateFixture], pagination: paginationFixture });
  api.createChecklist.mockResolvedValue(templateFixture);
  api.createRevision.mockResolvedValue(templateFixture);
  api.setChecklistStatus.mockResolvedValue(templateFixture);

  api.listInspections.mockResolvedValue({
    data: [inspectionFixture],
    pagination: paginationFixture,
  });
  api.createInspection.mockResolvedValue(inspectionFixture);
});

async function openDialog(triggerName: string): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: triggerName }));
  return screen.findByRole('dialog');
}

describe('administrator management workflows', () => {
  it('creates a user through the backend', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);
    await screen.findByText(userFixture.full_name);

    const dialog = await openDialog('Add user');
    await user.type(within(dialog).getByLabelText('Full name'), 'Jordan Jensen');
    await user.type(within(dialog).getByLabelText('Email'), 'jordan@example.com');
    await user.type(within(dialog).getByLabelText('Temporary password'), 'strong-password');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'ADMIN');
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }));

    await waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith({
        full_name: 'Jordan Jensen',
        email: 'jordan@example.com',
        password: 'strong-password',
        role: 'ADMIN',
      }),
    );
  });

  it('updates a user and confirms deactivation before calling the backend', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);
    await screen.findByText(userFixture.full_name);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const editDialog = await screen.findByRole('dialog');
    await user.clear(within(editDialog).getByLabelText('Full name'));
    await user.type(within(editDialog).getByLabelText('Full name'), 'Iris Lead Inspector');
    await user.selectOptions(within(editDialog).getByLabelText('Role'), 'ADMIN');
    await user.click(within(editDialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(api.updateUser).toHaveBeenCalledWith(userFixture.id, {
        full_name: 'Iris Lead Inspector',
        role: 'ADMIN',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Deactivate user?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(api.setUserStatus).toHaveBeenCalledWith(userFixture.id, false));
  });

  it('creates and deactivates a site with version-aware backend calls', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SitesPage />);
    await screen.findByText(siteFixture.name);

    const createDialog = await openDialog('Add site');
    await user.type(within(createDialog).getByLabelText('Name'), 'Harbor Depot');
    await user.type(within(createDialog).getByLabelText('Site code'), 'HARBOR-02');
    await user.type(within(createDialog).getByLabelText('Address'), '8 Dock Street');
    await user.click(within(createDialog).getByRole('button', { name: 'Create site' }));

    await waitFor(() =>
      expect(api.createSite).toHaveBeenCalledWith({
        name: 'Harbor Depot',
        site_code: 'HARBOR-02',
        address: '8 Dock Street',
        city: null,
        state: null,
        postal_code: null,
        country: null,
        description: null,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    const confirmDialog = await screen.findByRole('dialog', { name: 'Deactivate site?' });
    await user.click(within(confirmDialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() =>
      expect(api.setSiteStatus).toHaveBeenCalledWith(siteFixture.id, false, siteFixture.version),
    );
  });

  it('creates a checklist template with ordered items', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChecklistsPage />);
    await screen.findByText(templateFixture.name);

    const dialog = await openDialog('Create template');
    await user.type(within(dialog).getByLabelText('Template name'), 'Vehicle inspection');
    await user.type(within(dialog).getByLabelText('Question'), 'Are guards fitted?');
    await user.click(within(dialog).getByRole('button', { name: 'Create template' }));

    await waitFor(() =>
      expect(api.createChecklist).toHaveBeenCalledWith({
        name: 'Vehicle inspection',
        description: null,
        items: [
          {
            question: 'Are guards fitted?',
            description: null,
            response_type: 'YES_NO',
            is_required: true,
            display_order: 1,
            options: null,
          },
        ],
      }),
    );
  });

  it('publishes a new immutable checklist revision', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChecklistsPage />);
    await screen.findByText(templateFixture.name);

    await user.click(screen.getByRole('button', { name: 'New revision' }));
    const dialog = await screen.findByRole('dialog', { name: 'Publish new revision' });
    await user.clear(within(dialog).getByLabelText('Question'));
    await user.type(within(dialog).getByLabelText('Question'), 'Are emergency exits clear?');
    await user.click(within(dialog).getByRole('button', { name: 'Publish revision' }));

    await waitFor(() =>
      expect(api.createRevision).toHaveBeenCalledWith(templateFixture.id, {
        name: templateFixture.name,
        description: templateFixture.description,
        items: [
          {
            question: 'Are emergency exits clear?',
            description: null,
            response_type: 'YES_NO',
            is_required: true,
            display_order: 1,
            options: null,
          },
        ],
      }),
    );
  });

  it('assigns an inspection using the active template revision', async () => {
    const user = userEvent.setup();
    renderWithProviders(<InspectionsPage />);
    await screen.findByText(inspectionFixture.title);

    const dialog = await openDialog('Assign inspection');
    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: /North Plant/ })).toBeInTheDocument(),
    );

    await user.type(within(dialog).getByLabelText('Title'), 'New safety review');
    await user.selectOptions(within(dialog).getByLabelText('Site'), siteFixture.id);
    await user.selectOptions(within(dialog).getByLabelText('Checklist template'), templateFixture.id);
    await user.selectOptions(within(dialog).getByLabelText('Inspector'), userFixture.id);
    await user.click(within(dialog).getByRole('button', { name: 'Assign inspection' }));

    await waitFor(() =>
      expect(api.createInspection).toHaveBeenCalledWith({
        site_id: siteFixture.id,
        template_id: templateFixture.id,
        template_version: templateFixture.template_version,
        assigned_to: userFixture.id,
        title: 'New safety review',
        instructions: null,
        scheduled_at: null,
        due_at: null,
      }),
    );
  });
});
