import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '@/app/router';
import { setAccessToken } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { adminUser, inspectorCurrentUser, paginationFixture, summaryFixture } from '@/test/fixtures';
import { renderWithProviders } from '@/test/renderWithProviders';

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  listUsers: vi.fn(),
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

  it('blocks an inspector from administrator routes', () => {
    useAuthStore.setState({ user: inspectorCurrentUser, status: 'authenticated' });

    renderWithProviders(
      <>
        <LocationProbe />
        <AppRoutes />
      </>,
      { route: '/admin/dashboard' },
    );

    expect(screen.getByRole('heading', { name: 'Inspector dashboard' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/inspector/dashboard');
    expect(api.summary).not.toHaveBeenCalled();
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
});
