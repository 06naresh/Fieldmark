import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoadingIndicator } from '@/components/ui';
import { dashboardForRole } from '@/lib/auth';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth';

function SessionLoading(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <LoadingIndicator label="Restoring your session…" />
    </main>
  );
}

interface RequireAuthProps {
  children: ReactNode;
  roles?: UserRole[];
}

export function RequireAuth({ children, roles }: RequireAuthProps): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (!user) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={dashboardForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

interface PublicOnlyProps {
  children: ReactNode;
}

export function PublicOnly({ children }: PublicOnlyProps): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'loading') {
    return <SessionLoading />;
  }

  if (user) {
    return <Navigate to={dashboardForRole(user.role)} replace />;
  }

  return <>{children}</>;
}

export function HomeRedirect(): React.JSX.Element {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (status === 'loading') {
    return <SessionLoading />;
  }

  return <Navigate to={user ? dashboardForRole(user.role) : ROUTES.login} replace />;
}
