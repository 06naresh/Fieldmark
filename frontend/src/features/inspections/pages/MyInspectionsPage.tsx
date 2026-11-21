import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
  Input,
  Label,
  LoadingIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { useAuthStore } from '@/store/authStore';
import type { InspectionStatus } from '@/types/entities';
import { InspectionStatusBadge } from '@/features/inspections/components/InspectionStatusBadge';
import { useInspectionReferences } from '@/features/inspections/hooks/useInspectionReferences';

type StatusFilter = 'ALL' | InspectionStatus;

const statusFilters: StatusFilter[] = [
  'ALL',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REVIEWED',
  'CANCELLED',
];

export function MyInspectionsPage(): React.JSX.Element {
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const inspections = useQuery({
    queryKey: ['inspections', 'inspector-list', { search, statusFilter, page }],
    queryFn: () =>
      inspectionsApi.list({
        page,
        page_size: 20,
        search: search.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });
  const references = useInspectionReferences();

  if (inspections.isLoading || references.isLoading) {
    return <LoadingIndicator label="Loading assignments…" />;
  }

  if (inspections.error || references.error) {
    return (
      <ErrorState
        message={normalizeApiError(inspections.error ?? references.error).message}
        onRetry={() => void inspections.refetch()}
      />
    );
  }

  const allInspections = inspections.data?.data ?? [];
  const myInspections = currentUser
    ? allInspections.filter((inspection) => inspection.assigned_to === currentUser.id)
    : allInspections;
  const pagination = inspections.data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My inspections</h1>
        <p className="mt-1 text-muted-foreground">
          Review assignments and continue inspections that need your attention.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned work</CardTitle>
          <CardDescription>Search and filter your inspection assignments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="space-y-2">
              <Label htmlFor="inspector-search">Search</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="inspector-search"
                  className="pl-9"
                  placeholder="Search by title"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspector-status">Status</Label>
              <select
                id="inspector-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                {statusFilters.map((status) => (
                  <option key={status} value={status}>
                    {status === 'ALL' ? 'All statuses' : status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {myInspections.length === 0 ? (
            <EmptyState
              title="No matching inspections"
              description="Try another search or status filter. New assignments appear here automatically."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspection</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInspections.map((inspection) => {
                    const isActive =
                      inspection.status === 'ASSIGNED' || inspection.status === 'IN_PROGRESS';
                    return (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.title}</TableCell>
                        <TableCell>
                          {references.sitesById.get(inspection.site_id)?.name ?? inspection.site_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>
                              {references.templatesById.get(inspection.template_id)?.name ??
                                inspection.template_id}
                            </span>
                            <Badge variant="outline">v{inspection.template_version}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatDateTime(inspection.scheduled_at)}</TableCell>
                        <TableCell>
                          <InspectionStatusBadge status={inspection.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              to={
                                isActive
                                  ? ROUTES.inspector.executeInspection(inspection.id)
                                  : ROUTES.inspector.inspectionDetails(inspection.id)
                              }
                            >
                              {isActive ? 'Continue' : 'View'}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && pagination.total_pages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
