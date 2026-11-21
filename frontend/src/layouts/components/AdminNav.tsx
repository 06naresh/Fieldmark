import {
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  UserCog,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import type { NavigationGroup, NavigationItem } from '@/layouts/components/navigationTypes';

export type AdminNavItem = NavigationItem;
export type AdminNavGroup = NavigationGroup;

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: ROUTES.admin.dashboard, icon: LayoutDashboard }],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', to: ROUTES.admin.users, icon: UserCog },
      { label: 'Sites', to: ROUTES.admin.sites, icon: MapPin },
      { label: 'Checklists', to: ROUTES.admin.checklists, icon: ClipboardList },
      { label: 'Inspections', to: ROUTES.admin.inspections, icon: ClipboardCheck },
    ],
  },
  {
    label: 'Operations',
    items: [{ label: 'Sync Center', to: ROUTES.admin.sync, icon: RefreshCw }],
  },
];
