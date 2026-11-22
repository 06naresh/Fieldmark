import { AlertCircle, CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react';
import { Badge, Button, EmptyState, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { formatDateTime } from '@/lib/date';
import { retryLocalOperation } from '@/db/conflictRepository';
import type { SyncQueueRecord } from '@/db/localTypes';

interface SyncQueueTableProps {
  operations: SyncQueueRecord[];
  onChanged: () => void;
  onRetry: () => void;
}

function statusVariant(status: SyncQueueRecord['status']) {
  if (status === 'SYNCED') return 'success' as const;
  if (status === 'FAILED' || status === 'REJECTED') return 'destructive' as const;
  if (status === 'CONFLICT') return 'warning' as const;
  return 'secondary' as const;
}

function StatusIcon({ status }: { status: SyncQueueRecord['status'] }): React.JSX.Element {
  if (status === 'SYNCED') return <CheckCircle2 className="inline h-3.5 w-3.5" />;
  if (status === 'FAILED' || status === 'REJECTED') return <XCircle className="inline h-3.5 w-3.5" />;
  if (status === 'CONFLICT') return <AlertCircle className="inline h-3.5 w-3.5" />;
  return <Clock3 className="inline h-3.5 w-3.5" />;
}

export function SyncQueueTable({ operations, onChanged, onRetry }: SyncQueueTableProps): React.JSX.Element {
  const retry = async (operationId: string): Promise<void> => {
    await retryLocalOperation(operationId);
    onChanged();
    onRetry();
  };

  if (operations.length === 0) {
    return <EmptyState title="No synchronization operations" description="Inspection changes appear here when they are saved offline or submitted." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Operation</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last attempt</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Last error</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {operations.map((operation) => (
          <TableRow key={operation.id}>
            <TableCell>
              <span className="font-medium">{operation.operation_type}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {operation.id.slice(0, 8)}
              </span>
            </TableCell>
            <TableCell>
              <span className="font-medium">{operation.entity_type}</span>
              <span className="block max-w-48 truncate font-mono text-xs text-muted-foreground">{operation.entity_id}</span>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(operation.status)}>
                <StatusIcon status={operation.status} />
                <span className="ml-1">{operation.status}</span>
              </Badge>
              {operation.next_retry_at && operation.status === 'FAILED' ? (
                <span className="mt-1 block text-xs text-muted-foreground">Retry {formatDateTime(operation.next_retry_at)}</span>
              ) : null}
            </TableCell>
            <TableCell>
              {operation.last_attempt_at ? formatDateTime(operation.last_attempt_at) : '—'}
            </TableCell>
            <TableCell>{operation.attempts}</TableCell>
            <TableCell className="max-w-xs truncate text-xs">
              {operation.last_error ? `${operation.last_error.code}: ${operation.last_error.message}` : '—'}
            </TableCell>
            <TableCell className="text-right">
              {['FAILED', 'REJECTED'].includes(operation.status) ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void retry(operation.id)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
