import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/queryClient';
import { bootstrapSession, registerSessionRefresh } from '@/services/auth/session';
import {
  cancelScheduledSync,
  registerSyncTriggers,
  scheduleSync,
} from '@/services/sync/syncEngine';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
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

  useEffect(() => {
    // Foreground synchronization only. Background Sync remains an optional
    // enhancement and is never required for queue correctness.
    const unregisterTriggers = registerSyncTriggers();
    let previousUserId = useAuthStore.getState().user?.id ?? null;

    const unsubscribeAuth = useAuthStore.subscribe((state) => {
      const userId = state.user?.id ?? null;
      if (userId !== previousUserId) {
        if (previousUserId) {
          cancelScheduledSync(previousUserId);
        }
        if (userId) {
          // A session restored at startup and a fresh login are distinct
          // foreground triggers, but both use the same safe sync cycle.
          scheduleSync(previousUserId ? 'login' : 'startup');
        }
        previousUserId = userId;
      }
      if (!userId) {
        useSyncStore.getState().reset();
      }
    });

    return () => {
      unsubscribeAuth();
      unregisterTriggers();
      cancelScheduledSync();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
