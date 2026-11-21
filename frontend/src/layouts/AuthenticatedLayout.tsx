import { Outlet } from 'react-router-dom';
import { Header } from '@/layouts/components/Header';

export function AuthenticatedLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header showMobileToggle={false} />
      <main className="container flex-1 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
