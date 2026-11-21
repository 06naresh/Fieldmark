import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { FoundationPage } from '@/pages/FoundationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<FoundationPage />} />
      <Route path={ROUTES.login} element={<PlaceholderPage title="Sign in" description="Authentication is implemented in Phase 7." />} />

      <Route path={ROUTES.admin.dashboard} element={<PlaceholderPage title="Admin dashboard" />} />
      <Route path={ROUTES.admin.users} element={<PlaceholderPage title="Users" />} />
      <Route path={ROUTES.admin.sites} element={<PlaceholderPage title="Sites" />} />
      <Route path={ROUTES.admin.checklists} element={<PlaceholderPage title="Checklists" />} />
      <Route path={ROUTES.admin.inspections} element={<PlaceholderPage title="Inspections" />} />
      <Route path={ROUTES.admin.sync} element={<PlaceholderPage title="Sync Center" />} />

      <Route path={ROUTES.inspector.dashboard} element={<PlaceholderPage title="Inspector dashboard" />} />
      <Route path={ROUTES.inspector.inspections} element={<PlaceholderPage title="My inspections" />} />
      <Route path={ROUTES.inspector.executeInspection(':id')} element={<PlaceholderPage title="Execute inspection" />} />
      <Route path={ROUTES.inspector.inspectionDetails(':id')} element={<PlaceholderPage title="Inspection details" />} />
      <Route path={ROUTES.inspector.sync} element={<PlaceholderPage title="Sync Center" />} />

      <Route path={ROUTES.profile} element={<PlaceholderPage title="Profile" />} />
      <Route path={ROUTES.settings} element={<PlaceholderPage title="Settings" />} />
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
