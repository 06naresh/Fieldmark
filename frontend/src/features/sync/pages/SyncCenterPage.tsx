import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudOff,
  RefreshCw,
  Server,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LoadingIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@/components/ui';
import { listQueueOperations, getLocalSyncSummary } from '@/db/localRepositories';
import { hydrateRemoteConflicts } from '@/db/conflictRepository';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { syncNow } from '@/services/sync/syncEngine';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';
import { ConflictDetailsDialog } from '@/features/sync/components/ConflictDetailsDialog';
import { SyncQueueTable } from '@/features/sync/components/SyncQueueTable';
import { listConflictViews } from '@/features/sync/services/conflictViewService';
import type { ConflictView } from '@/features/sync/types/conflictView';

function SummaryCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'default' | 'warning' | 'danger' | 'success';
}): React.JSX.Element {
  const toneClass = {
    default: 'text-primary',
    warning: 'text-warning',
    danger: 'text-destructive',
    success: 'text-success',
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <span className={toneClass}>{icon}</span>
      </CardContent>
    </Card>
  );
}

export function SyncCenterPage(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const online = useOnlineStatus();
  const syncStore = useSyncStore();
  const queryClient = useQueryClient();
  const [selectedConflict, setSelectedConflict] = useState<ConflictView | null>(null);

  const queryKey = ['sync-center', user?.id, online];

  const reload = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey });
    const summary = user ? await getLocalSyncSummary(user.id).catch(() => null) : null;
    if (summary) {
      syncStore.setSummary(summary);
    }
  };

  const dataQuery = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) {
        throw new Error('Sign in to view synchronization status.');
      }
      if (online) {
        await hydrateRemoteConflicts(user.id).catch(() => undefined);
      }
      const [conflicts, operations, summary] = await Promise.all([
        listConflictViews(user.id, online),
        listQueueOperations(user.id),
        getLocalSyncSummary(user.id),
      ]);
      syncStore.setSummary(summary);
      return { conflicts, operations, summary };
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => syncNow({ reason: 'manual', force: false }),
    onSuccess: async (result) => {
      await reload();
      toast({
        title: result.status === 'success' ? 'Synchronization complete' : 'Synchronization needs attention',
        description: result.message ?? `${result.accepted} operations accepted.`,
        variant: result.status === 'failed' ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Synchronization failed',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  const summary = dataQuery.data?.summary ?? syncStore.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sync Center</h1>
          <p className="text-sm text-muted-foreground">
            Review queued changes, synchronization health, and conflicts requiring a decision.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={online ? 'success' : 'warning'}>
            {online ? <CheckCircle2 className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="ml-1">{online ? 'Online' : 'Offline'}</span>
          </Badge>
          <Button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={!online || syncMutation.isPending || syncStore.isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Synchronize now
          </Button>
        </div>
      </div>

      {syncStore.lastError ? (
        <ErrorState title="Last synchronization failed" message={syncStore.lastError} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Pending" value={summary?.pending ?? 0} icon={<Clock3 />} tone="default" />
        <SummaryCard title="Processing" value={summary?.processing ?? 0} icon={<RefreshCw />} tone="default" />
        <SummaryCard title="Failed" value={summary?.failed ?? 0} icon={<XCircle />} tone="danger" />
        <SummaryCard title="Open conflicts" value={summary?.openConflicts ?? 0} icon={<AlertTriangle />} tone="warning" />
        <SummaryCard title="Rejected" value={summary?.rejected ?? 0} icon={<XCircle />} tone="danger" />
        <SummaryCard title="Synced" value={summary?.synced ?? 0} icon={<CheckCircle2 />} tone="success" />
      </div>

      <div className="grid gap-4 text-sm lg:grid-cols-3">
        <p>
          <span className="font-medium">Connectivity:</span> {syncStore.connectivity}
        </p>
        <p>
          <span className="font-medium">Last sync:</span>{' '}
          {syncStore.lastSyncAt ? formatDateTime(syncStore.lastSyncAt) : 'Never'}
        </p>
        <p>
          <span className="font-medium">Last trigger:</span> {syncStore.lastTrigger ?? 'None'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Conflicts
          </CardTitle>
          <CardDescription>
            Both versions are preserved. Choose an explicit resolution after reviewing the differences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataQuery.isLoading ? <LoadingIndicator label="Loading conflicts" /> : null}
          {dataQuery.isError ? (
            <ErrorState
              title="Could not load conflicts"
              message={normalizeApiError(dataQuery.error).message}
              onRetry={() => void dataQuery.refetch()}
            />
          ) : null}
          {dataQuery.data && dataQuery.data.conflicts.length === 0 ? (
            <EmptyState
              title="No conflicts"
              description="No conflicting inspection data requires review."
              icon={<CheckCircle2 />}
            />
          ) : null}
          {dataQuery.data && dataQuery.data.conflicts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Local base</TableHead>
                  <TableHead>Server version</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataQuery.data.conflicts.map((conflict) => (
                  <TableRow key={conflict.id}>
                    <TableCell>
                      <span className="font-medium">{conflict.entityType}</span>
                      <span className="block max-w-48 truncate font-mono text-xs text-muted-foreground">
                        {conflict.entityId}
                      </span>
                    </TableCell>
                    <TableCell>{conflict.conflictType}</TableCell>
                    <TableCell>
                      <Badge variant={conflict.status === 'OPEN' ? 'warning' : 'success'}>
                        {conflict.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{conflict.baseVersion ?? 'Unknown'}</TableCell>
                    <TableCell>{conflict.serverVersion ?? 'Unknown'}</TableCell>
                    <TableCell>{formatDateTime(conflict.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedConflict(conflict)}
                      >
                        {conflict.status === 'OPEN' ? 'Review' : 'History'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Synchronization queue
          </CardTitle>
          <CardDescription>
            Durable local operations. Failed or rejected operations can be returned to the retry queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!online ? (
            <div className="mb-3 flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
              <CloudOff className="h-4 w-4" />
              Offline. Changes remain safely stored on this device.
            </div>
          ) : null}
          <SyncQueueTable
            operations={dataQuery.data?.operations ?? []}
            onChanged={() => void reload()}
            onRetry={() => syncMutation.mutate()}
          />
        </CardContent>
      </Card>

      <ConflictDetailsDialog
        conflict={selectedConflict}
        currentUser={user ?? {
          id: 'anonymous',
          full_name: 'Unknown',
          email: '',
          role: 'INSPECTOR',
          is_active: false,
        }}
        onClose={() => setSelectedConflict(null)}
        onResolved={() => {
          setSelectedConflict(null);
          void reload();
        }}
      />
    </div>
  );
}
