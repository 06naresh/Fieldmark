import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useServiceWorkerUpdate } from '@/pwa/useServiceWorkerUpdate';

export function ServiceWorkerUpdateBanner(): React.JSX.Element | null {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-lg flex-col gap-3 rounded-lg border border-primary/30 bg-card p-4 text-card-foreground shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">A new Fieldmark version is ready</p>
          <p className="text-sm text-muted-foreground">
            Reload to use the latest application shell. Your offline work stays on this device.
          </p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={() => void applyUpdate()}>
        Reload
      </Button>
    </div>
  );
}
