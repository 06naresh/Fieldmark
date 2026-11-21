import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  MapPin,
  Plus,
  RefreshCw,
  UserRound,
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
import { normalizeApiError } from '@/lib/error';
import { dashboardApi } from '@/services/api/dashboardApi';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ label, value, icon, description }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage(): React.JSX.Element {
  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.summary,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Operational overview from authorized backend data.
          </p>
        </div>
        <Button asChild>
          <Link to={ROUTES.admin.inspections}>
            <Plus className="h-4 w-4" />
            Assign inspection
          </Link>
        </Button>
      </div>

      {summaryQuery.isPending ? (
        <LoadingIndicator label="Loading dashboard summary…" className="py-16" />
      ) : summaryQuery.isError ? (
        <ErrorState
          message={normalizeApiError(summaryQuery.error).message}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : !summaryQuery.data ? (
        <EmptyState title="No summary available" description="The dashboard summary is empty." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={summaryQuery.data.total_users ?? '—'}
              icon={<UserRound className="h-5 w-5" />}
            />
            <StatCard
              label="Active inspectors"
              value={summaryQuery.data.active_inspectors ?? '—'}
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <StatCard
              label="Sites"
              value={summaryQuery.data.total_sites ?? '—'}
              icon={<MapPin className="h-5 w-5" />}
            />
            <StatCard
              label="Inspections"
              value={summaryQuery.data.total_inspections}
              icon={<ClipboardList className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Inspection status</CardTitle>
                <CardDescription>Current lifecycle distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusRow label="Assigned" value={summaryQuery.data.assigned_inspections} />
                <StatusRow label="In progress" value={summaryQuery.data.in_progress_inspections} />
                <StatusRow label="Submitted" value={summaryQuery.data.submitted_inspections} />
                <StatusRow label="Reviewed" value={summaryQuery.data.reviewed_inspections} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synchronization</CardTitle>
                <CardDescription>Server-side operation health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <StatusRow label="Pending operations" value={summaryQuery.data.pending_operations} />
                <StatusRow label="Failed operations" value={summaryQuery.data.failed_operations} />
                <StatusRow label="Open conflicts" value={summaryQuery.data.open_conflicts} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-2">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={ROUTES.admin.users}>Manage users</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={ROUTES.admin.sites}>Manage sites</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to={ROUTES.admin.checklists}>Manage checklists</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {summaryQuery.data.failed_operations + summaryQuery.data.open_conflicts > 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <span>
                Synchronization issues require attention. Review the Sync Center for details.
              </span>
              <Button asChild variant="link" className="ml-auto">
                <Link to={ROUTES.admin.sync}>
                  Open Sync Center
                  <RefreshCw className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <Badge variant="success">No synchronization issues reported</Badge>
          )}
        </>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
