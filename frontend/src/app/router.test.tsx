import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '@/app/router';
import { setAccessToken } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
  adminUser,
  inspectionFixture,
  inspectorCurrentUser,
  paginationFixture,
  siteFixture,
  summaryFixture,
  templateFixture,
} from '@/test/fixtures';
import { renderWithProviders } from '@/test/renderWithProviders';

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  listUsers: vi.fn(),
  listSites: vi.fn(),
  listChecklists: vi.fn(),
  listInspections: vi.fn(),
}));

vi.mock('@/services/api/dashboardApi', () => ({
  dashboardApi: { summary: api.summary },
}));

vi.mock('@/services/api/usersApi', () => ({
  usersApi: {
    list: api.listUsers,
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  },
}));

vi.mock('@/services/api/sitesApi', () => ({
  sitesApi: { list: api.listSites },
}));

vi.mock('@/services/api/checklistsApi', () => ({
  checklistsApi: { list: api.listChecklists },
}));

vi.mock('@/services/api/inspectionsApi', () => ({
  inspectionsApi: {
    list: api.listInspections,
    detail: vi.fn(),
    start: vi.fn(),
    saveAnswer: vi.fn(),
    submit: vi.fn(),
  },
}));

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
  api.summary.mockResolvedValue(summaryFixture);
  api.listUsers.mockResolvedValue({ data: [], pagination: paginationFixture });
  api.listSites.mockResolvedValue({ data: [siteFixture], pagination: paginationFixture });
  api.listChecklists.mockResolvedValue({ data: [templateFixture], pagination: paginationFixture });
  api.listInspections.mockResolvedValue({
    data: [inspectionFixture],
    pagination: paginationFixture,
  });
});

describe('application router', () => {
  it('redirects an unauthenticated admin route to login', () => {
    renderWithProviders(
      <>
        <LocationProbe />
        <AppRoutes />
      </>,
      { route: '/admin/dashboard' },
    );

    expect(screen.getByRole('heading', { name: 'Sign in to Fieldmark' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('shows admin navigation and protected admin pages to an administrator', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ user: adminUser, status: 'authenticated' });

    renderWithProviders(<AppRoutes />, { route: '/admin/dashboard' });

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Administration' });
    expect(within(navigation).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Sites' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Checklists' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Inspections' })).toBeInTheDocument();

    await user.click(within(navigation).getByRole('link', { name: 'Users' }));

    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument();
    await waitFor(() => expect(api.listUsers).toHaveBeenCalled());
  });

  it('blocks an inspector from administrator routes', async () => {
    useAuthStore.setState({ user: inspectorCurrentUser, status: 'authenticated' });

    renderWithProviders(
      <>
        <LocationProbe />
        <AppRoutes />
      </>,
      { route: '/admin/dashboard' },
    );

    expect(await screen.findByRole('heading', { name: 'Inspector dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/inspector/dashboard');
    expect(
      within(screen.getByRole('navigation', { name: 'Inspector' })).getByRole('link', {
        name: 'My inspections',
      }),
    ).toBeInTheDocument();
    await waitFor(() => expect(api.summary).toHaveBeenCalled());
  });

  it('redirects an authenticated administrator away from the login page', () => {
    useAuthStore.setState({ user: adminUser, status: 'authenticated' });

    renderWithProviders(
      <>
        <LocationProbe />
        <AppRoutes />
      </>,
      { route: '/login' },
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/admin/dashboard');
    expect(screen.queryByRole('heading', { name: 'Sign in to Fieldmark' })).not.toBeInTheDocument();
  });

  it('allows an unauthenticated user to open the signup page', () => {
    renderWithProviders(<AppRoutes />, { route: '/signup' });

    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  it('redirects an authenticated user away from the signup page', () => {
    useAuthStore.setState({ user: inspectorCurrentUser, status: 'authenticated' });

    renderWithProviders(
      <>
        <LocationProbe />
        <AppRoutes />
      </>,
      { route: '/signup' },
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/inspector/dashboard');
    expect(screen.queryByRole('heading', { name: 'Create your account' })).not.toBeInTheDocument();
  });
});
