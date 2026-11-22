import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Download, MapPin, Play } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  LoadingIndicator,
  toast,
} from '@/components/ui';
import { markInspectionStarted, queueInspectionStart } from '@/db/localRepositories';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { useAuthStore } from '@/store/authStore';
import { InspectionStatusBadge } from '@/features/inspections/components/InspectionStatusBadge';
import {
  cacheInspectionForOffline,
  getInspectionDetail,
  isInspectionAvailableOffline,
} from '@/features/inspections/services/offlineInspectionService';

export function InspectionDetailsPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const ownerId = currentUser?.id ?? 'anonymous';
  const isOnline = useOnlineStatus();

  const detail = useQuery({
    queryKey: ['inspection', id, 'detail'],
    queryFn: () => getInspectionDetail(ownerId, id, () => inspectionsApi.detail(id)),
    enabled: id.length > 0,
  });

  const offlineStatus = useQuery({
    queryKey: ['inspection', id, 'offline-status'],
    queryFn: () => isInspectionAvailableOffline(ownerId, id),
    enabled: id.length > 0 && ownerId !== 'anonymous',
  });

  const download = useMutation({
    mutationFn: async () => {
      const result = await inspectionsApi.detail(id);
      await cacheInspectionForOffline(ownerId, result);
    },
    onSuccess: async () => {
      await offlineStatus.refetch();
      toast({
        title: 'Available offline',
        description: 'The checklist, site, and answers are stored on this device.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Could not download inspection',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  const start = useMutation({
    mutationFn: async (version: number) => {
      if (!isOnline) {
        if (!detail.data) {
          throw new Error('Download this inspection before starting it offline.');
        }
        await queueInspectionStart(ownerId, detail.data);
        return { status: 'IN_PROGRESS' as const, version, queuedOffline: true };
      }
      const result = await inspectionsApi.start(id, version);
      return { ...result, queuedOffline: false };
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(['inspection', id, 'detail'], (previous: unknown) => {
        if (!previous || typeof previous !== 'object') {
          return previous;
        }
        return { ...previous, status: result.status, version: result.version };
      });
      if (detail.data && !result.queuedOffline) {
        await markInspectionStarted(ownerId, id, result.version);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspections'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['inspection', id, 'detail'] }),
      ]);
      toast({
        title: result.queuedOffline ? 'Inspection started offline' : 'Inspection started',
        description: result.queuedOffline
          ? 'The start is saved on this device and will synchronize when you reconnect.'
          : 'You can now complete the assigned checklist.',
        variant: result.queuedOffline ? 'warning' : 'success',
      });
      navigate(ROUTES.inspector.executeInspection(id));
    },
    onError: (error) => {
      toast({
        title: 'Could not start inspection',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  if (!id) {
    return <ErrorState message="No inspection was selected." />;
  }

  if (detail.isLoading) {
    return <LoadingIndicator label="Loading inspection details…" />;
  }

  if (detail.error || !detail.data) {
    return (
      <ErrorState
        message={detail.error ? normalizeApiError(detail.error).message : 'Inspection not found.'}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  const inspection = detail.data;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to={ROUTES.inspector.inspections}>
          <ArrowLeft className="h-4 w-4" />
          Back to my inspections
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{inspection.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inspection ID: {inspection.id}</p>
        </div>
        <InspectionStatusBadge status={inspection.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            {offlineStatus.data ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Available offline on this device</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-muted-foreground" />
                <span>Not yet downloaded for offline use</span>
              </>
            )}
          </div>
          {!offlineStatus.data && isOnline ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => download.mutate()}
              disabled={download.isPending}
            >
              <Download className="h-4 w-4" />
              {download.isPending ? 'Downloading…' : 'Make available offline'}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {inspection.instructions ? (
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{inspection.instructions}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Site details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{inspection.site.name}</p>
            <p className="text-muted-foreground">{inspection.site.site_code}</p>
            <p className="text-muted-foreground">{inspection.site.address}</p>
            {inspection.site.city || inspection.site.state || inspection.site.postal_code ? (
              <p className="text-muted-foreground">
                {[inspection.site.city, inspection.site.state, inspection.site.postal_code]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            ) : null}
            {inspection.site.description ? (
              <p className="pt-2 text-muted-foreground">{inspection.site.description}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assignment details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Checklist</span>
              <span className="text-right font-medium">
                {inspection.template.name} <Badge variant="outline">v{inspection.template_version}</Badge>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Checklist items</span>
              <span className="font-medium">{inspection.checklist_items.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Answers saved</span>
              <span className="font-medium">{inspection.answers.length}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Current version</span>
              <span className="font-medium">{inspection.version}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Assigned to</span>
              <span className="text-right font-medium">
                {currentUser?.id === inspection.assigned_to ? 'You' : inspection.assigned_to}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Scheduled</span>
              <span className="text-right font-medium">
                {formatDateTime(inspection.scheduled_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Due</span>
              <span className="text-right font-medium">{formatDateTime(inspection.due_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {inspection.status === 'ASSIGNED' ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>Ready to begin</CardTitle>
            <CardDescription>
              Starting the inspection creates an in-progress draft and locks the assigned checklist
              revision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => start.mutate(inspection.version)} disabled={start.isPending}>
              <Play className="h-4 w-4" />
              {start.isPending ? 'Starting…' : 'Start inspection'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {inspection.status === 'IN_PROGRESS' ? (
        <Card>
          <CardHeader>
            <CardTitle>Continue where you left off</CardTitle>
            <CardDescription>Your assigned checklist and saved answers are ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={ROUTES.inspector.executeInspection(inspection.id)}>Continue inspection</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {inspection.status === 'SUBMITTED' || inspection.status === 'REVIEWED' ? (
        <CardDescription>
          This inspection has been submitted and is read-only. Contact an administrator if a
          correction is required.
        </CardDescription>
      ) : null}
    </div>
  );
}
