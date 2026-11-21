import { Link, NavLink } from 'react-router-dom';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { adminNavGroups } from '@/layouts/components/AdminNav';
import type { NavigationGroup } from '@/layouts/components/navigationTypes';

interface SidebarProps {
  groups?: NavigationGroup[];
  homeRoute?: string;
  ariaLabel?: string;
}

export function Sidebar({
  groups = adminNavGroups,
  homeRoute = ROUTES.admin.dashboard,
  ariaLabel = 'Administration',
}: SidebarProps): React.JSX.Element {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link to={homeRoute} className="text-lg font-bold tracking-tight">
          {APP_NAME}
        </Link>
      </div>

      <nav aria-label={ariaLabel} className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Settings
          </p>
          <div className="space-y-1">
            <NavLink
              to={ROUTES.profile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              Profile
            </NavLink>
          </div>
        </div>
      </nav>
    </aside>
  );
}
