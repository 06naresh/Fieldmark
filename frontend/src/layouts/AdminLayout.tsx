import { Outlet } from 'react-router-dom';
import { Header } from '@/layouts/components/Header';
import { MobileNavigation } from '@/layouts/components/MobileNavigation';
import { Sidebar } from '@/layouts/components/Sidebar';

export function AdminLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileNavigation />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main-content" className="container flex-1 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
