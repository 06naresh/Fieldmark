import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRoutes } from '@/app/router';

describe('application router', () => {
  it('renders the foundation page and navigates to admin and inspector routes', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Fieldmark foundation is ready' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Open admin dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fieldmark foundation is ready' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Return home' }));
    expect(await screen.findByRole('heading', { name: 'Fieldmark foundation is ready' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Open inspector dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Inspector dashboard' })).toBeInTheDocument();
  });

  it('renders a not-found page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
