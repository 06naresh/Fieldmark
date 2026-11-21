import { Menu, Wifi, WifiOff } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/layouts/components/ThemeToggle';
import { UserMenu } from '@/layouts/components/UserMenu';

interface HeaderProps {
  showMobileToggle?: boolean;
}

export function Header({ showMobileToggle = true }: HeaderProps): React.JSX.Element {
  const isOnline = useOnlineStatus();
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      {showMobileToggle ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.full_name ?? 'Fieldmark'}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.role ?? 'Workspace'}</p>
      </div>

      <Badge variant={isOnline ? 'success' : 'warning'} className="hidden gap-1 sm:inline-flex">
        {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
