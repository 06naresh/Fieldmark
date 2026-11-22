import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  RefreshCw,
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
} from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { dashboardApi } from '@/services/api/dashboardApi';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { useAuthStore } from '@/store/authStore';
import {
  getAssignedInspections,
  getSyncSummary,
} from '@/features/inspections/services/offlineInspectionService';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { InspectionStatusBadge } from '@/features/inspections/components/InspectionStatusBadge';
import { useInspectionReferences } from '@/features/inspections/hooks/useInspectionReferences';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  description: string;
}

function StatCard({ label, value, icon, description }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">{icon}</div>
      </CardContent>
    </Card>
  );
}

export function InspectorDashboardPage(): React.JSX.Element {
  const currentUser = useAuthStore((state) => state.user);
  const isOnline = useOnlineStatus();
  const ownerId = currentUser?.id ?? 'anonymous';
  const summary = useQuery({
    queryKey: ['dashboard', 'summary', 'inspector'],
    queryFn: dashboardApi.summary,
    enabled: isOnline,
  });
  const assignments = useQuery({
    queryKey: ['inspections', 'inspector-dashboard'],
    queryFn: () => getAssignedInspections(ownerId, () => inspectionsApi.list({ page_size: 20 })),
  });
  const localSync = useQuery({
    queryKey: ['local-sync-summary', ownerId],
    queryFn: () => getSyncSummary(ownerId),
    enabled: ownerId !== 'anonymous',
  });
  const references = useInspectionReferences();

  if ((isOnline && summary.isLoading) || assignments.isLoading || references.isLoading || localSync.isLoading) {
    return <LoadingIndicator label="Loading your work…" />;
  }

  if (summary.error || assignments.error || references.error) {
    return (
      <ErrorState
        message={normalizeApiError(summary.error ?? assignments.error ?? references.error).message}
        onRetry={() => {
          void summary.refetch();
          void assignments.refetch();
        }}
      />
    );
  }

  const inspections = assignments.data?.data ?? [];
  const myInspections = currentUser
    ? inspections.filter((inspection) => inspection.assigned_to === currentUser.id)
    : inspections;
  const nextInspection = myInspections.find(
    (inspection) => inspection.status === 'ASSIGNED' || inspection.status === 'IN_PROGRESS',
  );
  const stats = summary.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inspector dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back{currentUser ? `, ${currentUser.full_name}` : ''}. Here is your current work.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={ROUTES.inspector.inspections}>
            View all assignments
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned"
          value={stats?.assigned_inspections ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          description="Ready to start"
        />
        <StatCard
          label="In progress"
          value={stats?.in_progress_inspections ?? 0}
          icon={<ClipboardCheck className="h-5 w-5" />}
          description="Draft work awaiting completion"
        />
        <StatCard
          label="Submitted"
          value={stats?.submitted_inspections ?? 0}
          icon={<Clock3 className="h-5 w-5" />}
          description="Completed inspections"
        />
        <StatCard
          label="Pending sync"
          value={isOnline ? (stats?.pending_operations ?? 0) : (localSync.data?.pending ?? 0)}
          icon={<RefreshCw className="h-5 w-5" />}
          description="Operations awaiting confirmation"
        />
      </div>

      {nextInspection ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Next inspection</CardTitle>
                <CardDescription>{nextInspection.title}</CardDescription>
              </div>
              <InspectionStatusBadge status={nextInspection.status} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-medium">Site:</span>{' '}
                {references.sitesById.get(nextInspection.site_id)?.name ?? nextInspection.site_id}
              </p>
              <p>
                <span className="font-medium">Scheduled:</span>{' '}
                {formatDateTime(nextInspection.scheduled_at)}
              </p>
              <p>
                <span className="font-medium">Checklist:</span>{' '}
                {references.templatesById.get(nextInspection.template_id)?.name ??
                  nextInspection.template_id}{' '}
                <Badge variant="outline">v{nextInspection.template_version}</Badge>
              </p>
            </div>
            <Button asChild>
              <Link to={ROUTES.inspector.executeInspection(nextInspection.id)}>
                Continue inspection
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No active inspections"
          description="You are all caught up. New assignments will appear here."
          action={
            <Button asChild variant="outline">
              <Link to={ROUTES.inspector.inspections}>View my inspections</Link>
            </Button>
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent assignments</CardTitle>
          <CardDescription>Your latest assigned inspection work.</CardDescription>
        </CardHeader>
        <CardContent>
          {myInspections.length === 0 ? (
            <EmptyState title="No assignments" description="No inspections are assigned to you yet." />
          ) : (
            <ul className="divide-y rounded-md border">
              {myInspections.slice(0, 5).map((inspection) => (
                <li key={inspection.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inspection.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {references.sitesById.get(inspection.site_id)?.name ?? inspection.site_id} ·{' '}
                      {formatDateTime(inspection.scheduled_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <InspectionStatusBadge status={inspection.status} />
                    <Button asChild variant="ghost" size="sm">
                      <Link to={ROUTES.inspector.inspectionDetails(inspection.id)}>Open</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
