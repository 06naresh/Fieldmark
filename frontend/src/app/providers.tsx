import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { bootstrapSession, registerSessionRefresh } from '@/services/auth/session';
import { useThemeStore } from '@/store/themeStore';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const theme = useThemeStore((state) => state.theme);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const bootstrapStarted = useRef(false);

  useEffect(() => {
    initializeTheme();

    if (theme !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => initializeTheme();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [initializeTheme, theme]);

  useEffect(() => {
    registerSessionRefresh();

    // Strict Mode invokes effects twice in development; session bootstrap must
    // not rotate the refresh token twice before the first request completes.
    if (bootstrapStarted.current) {
      return;
    }
    bootstrapStarted.current = true;
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
