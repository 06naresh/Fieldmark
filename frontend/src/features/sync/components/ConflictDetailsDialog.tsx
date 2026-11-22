import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Save,
  Server,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@/components/ui';
import { getLocalConflict } from '@/db/conflictRepository';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { resolveConflict } from '@/services/sync/conflictResolutionService';
import type {
  ConflictResolutionType,
  ConflictResolveResponse,
} from '@/services/sync/syncTypes';
import type { CurrentUser } from '@/types/auth';
import type { AnswerValue } from '@/types/entities';
import type { ConflictView } from '@/features/sync/types/conflictView';

interface ConflictDetailsDialogProps {
  conflict: ConflictView | null;
  currentUser: CurrentUser;
  onClose: () => void;
  onResolved: () => void;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return 'No answer';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function parseManualAnswer(raw: string, sample: unknown): AnswerValue {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') {
    return null;
  }
  const normalized = trimmed.toLowerCase();
  if (normalized === 'true' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === 'no') {
    return false;
  }
  if (typeof sample === 'number' || /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (Array.isArray(sample) || trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return raw;
}

function SnapshotCard({
  title,
  description,
  payload,
  icon,
}: {
  title: string;
  description: string;
  payload: Record<string, unknown>;
  icon: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {Object.keys(payload).length === 0 ? (
          <p className="text-muted-foreground">No snapshot is available.</p>
        ) : (
          Object.entries(payload)
            .filter(([key]) => key !== 'payload_hash')
            .map(([key, value]) => (
              <div key={key} className="grid gap-1 border-b pb-2 last:border-b-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {key}
                </span>
                <span className="whitespace-pre-wrap break-words">{formatValue(value)}</span>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}

export function ConflictDetailsDialog({
  conflict,
  currentUser,
  onClose,
  onResolved,
}: ConflictDetailsDialogProps): React.JSX.Element {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  useEffect(() => {
    setConfirmDiscard(false);
    setManualValue(formatValue(conflict?.serverPayload.answer_value ?? null));
    setManualNotes(
      typeof conflict?.serverPayload.notes === 'string' ? conflict.serverPayload.notes : '',
    );
  }, [conflict]);

  const mutation = useMutation({
    mutationFn: async ({
      resolutionType,
      manual,
    }: {
      resolutionType: ConflictResolutionType;
      manual?: boolean;
    }): Promise<ConflictResolveResponse> => {
      if (!conflict?.remoteId) {
        throw new Error('This conflict has not been recorded on the server yet.');
      }
      const localConflict = conflict.localId
        ? await getLocalConflict(currentUser.id, conflict.localId)
        : undefined;
      const sample =
        conflict.serverPayload.answer_value ?? conflict.localPayload.answer_value ?? null;
      return resolveConflict({
        ownerId: currentUser.id,
        currentUser,
        localConflict,
        remoteConflictId: conflict.remoteId,
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        operationId: conflict.operationId,
        serverVersion: conflict.serverVersion,
        resolutionType,
        manualValue: manual
          ? {
              answer_value: parseManualAnswer(manualValue, sample),
              notes: manualNotes,
            }
          : undefined,
      });
    },
    onSuccess: (response) => {
      toast({
        title: 'Conflict resolved',
        description: `${response.resolution_type.replace(/_/g, ' ').toLowerCase()} was recorded.`,
        variant: 'success',
      });
      onResolved();
    },
    onError: (error) => {
      toast({
        title: 'Could not resolve conflict',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  if (!conflict) {
    return <></>;
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const canUseLocalSnapshot = Boolean(conflict.localId);
  const canManualMerge = conflict.entityType === 'inspection_answer' && canUseLocalSnapshot;
  const busy = mutation.isPending;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Conflict details
            <Badge variant={conflict.status === 'OPEN' ? 'warning' : 'success'}>
              {conflict.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {conflict.entityType} · {conflict.entityId} · detected{' '}
            {formatDateTime(conflict.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <p>
            <span className="font-medium">Local base version:</span>{' '}
            {conflict.baseVersion ?? 'Unknown'}
          </p>
          <p>
            <span className="font-medium">Server version:</span>{' '}
            {conflict.serverVersion ?? 'Unknown'}
          </p>
          <p>
            <span className="font-medium">Reason:</span> {conflict.conflictType}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SnapshotCard
            title="Local version"
            description="The value saved on this device before synchronization."
            payload={conflict.localPayload}
            icon={<Save className="h-4 w-4" />}
          />
          <SnapshotCard
            title="Server version"
            description="The authoritative value reported by the server."
            payload={conflict.serverPayload}
            icon={<Server className="h-4 w-4" />}
          />
        </div>

        {conflict.resolutionType ? (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Resolution history</p>
            <p>
              {conflict.resolutionType} by {conflict.resolvedBy ?? 'unknown user'} at{' '}
              {formatDateTime(conflict.resolvedAt)}
            </p>
          </div>
        ) : null}

        {mutation.isError ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {normalizeApiError(mutation.error).message}
          </p>
        ) : null}

        {conflict.status === 'OPEN' ? (
          <div className="space-y-4">
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={confirmDiscard}
                onChange={(event) => setConfirmDiscard(event.target.checked)}
              />
              <span>
                I understand that accepting the server or administrative version will discard the
                conflicting local value.
              </span>
            </label>

            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="outline"
                disabled={!canUseLocalSnapshot || busy || conflict.serverVersion === null}
                onClick={() =>
                  mutation.mutate({ resolutionType: 'KEEP_LOCAL' })
                }
              >
                <Copy className="h-4 w-4" />
                Keep local version
              </Button>
              <Button
                type="button"
                disabled={
                  !canUseLocalSnapshot ||
                  !confirmDiscard ||
                  busy ||
                  conflict.serverVersion === null
                }
                onClick={() => mutation.mutate({ resolutionType: 'KEEP_SERVER' })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept server version
              </Button>
              {isAdmin ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!confirmDiscard || busy || conflict.serverVersion === null}
                  onClick={() => mutation.mutate({ resolutionType: 'ADMIN_RESOLUTION' })}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Apply administrative resolution
                </Button>
              ) : null}
            </DialogFooter>

            {canManualMerge ? (
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <h3 className="font-medium">Manual merge</h3>
                  <p className="text-xs text-muted-foreground">
                    Enter the corrected answer. It will be queued as a new version-checked
                    operation.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manual-answer">Corrected answer</Label>
                    <Input
                      id="manual-answer"
                      value={manualValue}
                      onChange={(event) => setManualValue(event.target.value)}
                      placeholder="true, text, number, or comma-separated choices"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manual-notes">Notes</Label>
                    <Input
                      id="manual-notes"
                      value={manualNotes}
                      onChange={(event) => setManualNotes(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || conflict.serverVersion === null}
                  onClick={() => mutation.mutate({ resolutionType: 'MANUAL_MERGE', manual: true })}
                >
                  Submit manual resolution
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
