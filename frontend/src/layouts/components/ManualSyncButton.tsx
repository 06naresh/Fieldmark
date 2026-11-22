import { RefreshCw } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { syncNow } from '@/services/sync/syncEngine';
import { useSyncStore } from '@/store/syncStore';

/** Header-level foreground sync action; the full Sync Center is a later phase. */
export function ManualSyncButton(): React.JSX.Element {
  const isOnline = useOnlineStatus();
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const pending = useSyncStore((state) => state.summary?.pending ?? 0);

  async function handleSync(): Promise<void> {
    const result = await syncNow({ reason: 'manual', force: true });

    if (result.status === 'failed') {
      toast({
        title: 'Synchronization failed',
        description: result.message ?? 'Pending work remains saved on this device.',
        variant: 'destructive',
      });
      return;
    }

    if (result.status === 'skipped') {
      toast({
        title: 'Synchronization skipped',
        description: result.message ?? 'Synchronization is not available right now.',
        variant: 'warning',
      });
      return;
    }

    toast({
      title: result.status === 'partial' ? 'Synchronization needs attention' : 'Synchronization complete',
      description:
        result.status === 'partial'
          ? 'Some operations need review. Nothing conflicting was overwritten.'
          : `${result.accepted} operation${result.accepted === 1 ? '' : 's'} confirmed.`,
      variant: result.status === 'partial' ? 'warning' : 'success',
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleSync()}
      disabled={!isOnline || isSyncing}
      title={isOnline ? 'Synchronize pending work' : 'Connect to the internet to synchronize'}
      className="hidden sm:inline-flex"
    >
      <RefreshCw className={isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      {isSyncing ? 'Synchronizing…' : 'Synchronize now'}
      {pending > 0 ? ` (${pending})` : ''}
    </Button>
  );
}
