import { Link, NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import { adminNavGroups } from '@/layouts/components/AdminNav';
import type { NavigationGroup } from '@/layouts/components/navigationTypes';

interface MobileNavigationProps {
  groups?: NavigationGroup[];
  homeRoute?: string;
  ariaLabel?: string;
}

export function MobileNavigation({
  groups = adminNavGroups,
  homeRoute = ROUTES.admin.dashboard,
  ariaLabel = 'Mobile administration',
}: MobileNavigationProps): React.JSX.Element | null {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const closeSidebar = useAppStore((state) => state.setSidebarOpen);

  if (!sidebarOpen) {
    return null;
  }

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    );

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close navigation"
        onClick={() => closeSidebar(false)}
      />
      <nav
        aria-label={ariaLabel}
        className="absolute left-0 top-0 flex h-full w-72 flex-col border-r bg-card shadow-xl"
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to={homeRoute} onClick={() => closeSidebar(false)} className="text-lg font-bold">
            {APP_NAME}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => closeSidebar(false)}
            aria-label="Close navigation panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
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
                    className={linkClass}
                    onClick={() => closeSidebar(false)}
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
              <NavLink to={ROUTES.profile} className={linkClass} onClick={() => closeSidebar(false)}>
                Profile
              </NavLink>
              <NavLink to={ROUTES.settings} className={linkClass} onClick={() => closeSidebar(false)}>
                Settings
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
