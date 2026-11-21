import { ClipboardList, LayoutDashboard, RefreshCw } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import type { NavigationGroup } from '@/layouts/components/navigationTypes';

export const inspectorNavGroups: NavigationGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: ROUTES.inspector.dashboard, icon: LayoutDashboard }],
  },
  {
    label: 'My work',
    items: [{ label: 'My inspections', to: ROUTES.inspector.inspections, icon: ClipboardList }],
  },
  {
    label: 'Operations',
    items: [{ label: 'Sync Center', to: ROUTES.inspector.sync, icon: RefreshCw }],
  },
];
