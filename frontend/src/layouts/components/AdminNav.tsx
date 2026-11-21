import {
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/constants';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

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
