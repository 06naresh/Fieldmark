import { useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { ApiError } from '@/lib/error';
import { renderWithProviders } from '@/test/renderWithProviders';

const signUpMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/auth/session', () => ({
  signUp: signUpMock,
}));

function LocationProbe(): React.JSX.Element {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Full name'), 'Sam Inspector');
  await user.type(screen.getByLabelText('Email address'), 'sam.inspector@example.com');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'InspectorPass123!');
  await user.type(screen.getByLabelText('Confirm password'), 'InspectorPass123!');
}

beforeEach(() => {
  signUpMock.mockReset();
});

describe('SignupForm', () => {
  it('shows validation errors and does not submit an invalid form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm />);

    await user.click(screen.getByRole('button', { name: 'Create inspector account' }));

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords before submitting', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignupForm />);

    await user.type(screen.getByLabelText('Full name'), 'Sam Inspector');
    await user.type(screen.getByLabelText('Email address'), 'sam.inspector@example.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'InspectorPass123!');
    await user.type(screen.getByLabelText('Confirm password'), 'DifferentPass123!');
    await user.click(screen.getByRole('button', { name: 'Create inspector account' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
  });

  it('creates the account and navigates to the inspector dashboard', async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValue('INSPECTOR');
    renderWithProviders(
      <>
        <SignupForm />
        <LocationProbe />
      </>,
    );

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create inspector account' }));

    await waitFor(() => expect(signUpMock).toHaveBeenCalledTimes(1));
    expect(signUpMock).toHaveBeenCalledWith({
      full_name: 'Sam Inspector',
      email: 'sam.inspector@example.com',
      password: 'InspectorPass123!',
    });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/inspector/dashboard'));
  });

  it('displays a server error without clearing the form', async () => {
    const user = userEvent.setup();
    signUpMock.mockRejectedValue(
      new ApiError({
        code: 'CONFLICT',
        message: 'A user with this email already exists.',
        status: 409,
      }),
    );
    renderWithProviders(<SignupForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create inspector account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A user with this email already exists.');
    expect(screen.getByLabelText('Email address')).toHaveValue('sam.inspector@example.com');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('InspectorPass123!');
  });
});
