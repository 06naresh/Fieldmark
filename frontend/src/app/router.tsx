import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomeRedirect, PublicOnly, RequireAuth } from '@/app/guards';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AuthenticatedLayout } from '@/layouts/AuthenticatedLayout';
import { InspectorLayout } from '@/layouts/InspectorLayout';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { ProfilePage } from '@/features/auth/pages/ProfilePage';
import { SettingsPage } from '@/features/auth/pages/SettingsPage';
import { AdminDashboardPage } from '@/features/dashboard/pages/AdminDashboardPage';
import { UsersPage } from '@/features/users/pages/UsersPage';
import { SitesPage } from '@/features/sites/pages/SitesPage';
import { ChecklistsPage } from '@/features/checklists/pages/ChecklistsPage';
import { InspectionsPage } from '@/features/inspections/pages/InspectionsPage';
import { ExecuteInspectionPage } from '@/features/inspections/pages/ExecuteInspectionPage';
import { InspectionDetailsPage } from '@/features/inspections/pages/InspectionDetailsPage';
import { InspectorDashboardPage } from '@/features/inspections/pages/InspectorDashboardPage';
import { MyInspectionsPage } from '@/features/inspections/pages/MyInspectionsPage';
import { ROUTES } from '@/lib/constants';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<HomeRedirect />} />

      <Route
        path={ROUTES.login}
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      <Route
        element={
          <RequireAuth roles={['ADMIN']}>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path={ROUTES.admin.dashboard} element={<AdminDashboardPage />} />
        <Route path={ROUTES.admin.users} element={<UsersPage />} />
        <Route path={ROUTES.admin.sites} element={<SitesPage />} />
        <Route path={ROUTES.admin.checklists} element={<ChecklistsPage />} />
        <Route path={ROUTES.admin.inspections} element={<InspectionsPage />} />
        <Route
          path={ROUTES.admin.sync}
          element={<PlaceholderPage title="Sync Center" description="Synchronization monitoring is implemented in a later phase." />}
        />
      </Route>

      <Route
        element={
          <RequireAuth roles={['INSPECTOR']}>
            <InspectorLayout />
          </RequireAuth>
        }
      >
        <Route path={ROUTES.inspector.dashboard} element={<InspectorDashboardPage />} />
        <Route path={ROUTES.inspector.inspections} element={<MyInspectionsPage />} />
        <Route path={ROUTES.inspector.inspectionDetails(':id')} element={<InspectionDetailsPage />} />
        <Route path={ROUTES.inspector.executeInspection(':id')} element={<ExecuteInspectionPage />} />
        <Route
          path={ROUTES.inspector.sync}
          element={<PlaceholderPage title="Sync Center" description="Synchronization monitoring is implemented in a later phase." />}
        />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AuthenticatedLayout />
          </RequireAuth>
        }
      >
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.settings} element={<SettingsPage />} />
      </Route>

      <Route path={ROUTES.notFound} element={<NotFoundPage />} />
    </Routes>
  );
}

export function AppRouter(): React.JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
