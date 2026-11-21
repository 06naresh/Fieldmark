import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  LoadingIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatDateTime } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { checklistsApi } from '@/services/api/checklistsApi';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { sitesApi } from '@/services/api/sitesApi';
import { usersApi } from '@/services/api/usersApi';
import type { Inspection, InspectionStatus } from '@/types/entities';
import { InspectionFormDialog } from '@/features/inspections/components/InspectionFormDialog';

type StatusFilter = 'ALL' | InspectionStatus;

const statusVariants: Record<InspectionStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  ASSIGNED: 'default',
  IN_PROGRESS: 'warning',
  SUBMITTED: 'secondary',
  REVIEWED: 'success',
  CANCELLED: 'destructive',
};

export function InspectionsPage(): React.JSX.Element {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [siteFilter, setSiteFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [detailsInspection, setDetailsInspection] = useState<Inspection | null>(null);

  const inspectionsQuery = useQuery({
    queryKey: ['inspections', { page, search, statusFilter, siteFilter }],
    queryFn: () =>
      inspectionsApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        site_id: siteFilter || undefined,
      }),
  });

  const sitesQuery = useQuery({
    queryKey: ['sites', 'inspection-labels'],
    queryFn: () => sitesApi.list({ page: 1, page_size: 100 }),
  });

  const templatesQuery = useQuery({
    queryKey: ['checklists', 'inspection-labels'],
    queryFn: () => checklistsApi.list({ page: 1, page_size: 100 }),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'inspection-labels'],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
  });

  const inspections = inspectionsQuery.data?.data ?? [];
  const pagination = inspectionsQuery.data?.pagination;
  const sites = sitesQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];

  const siteName = (id: string): string =>
    sites.find((site) => site.id === id)?.name ?? id.slice(0, 8);
  const templateLabel = (inspection: Inspection): string => {
    const template = templates.find(
      (item) =>
        item.id === inspection.template_id &&
        item.template_version === inspection.template_version,
    );
    return template ? `${template.name} · v${template.template_version}` : `v${inspection.template_version}`;
  };
  const inspectorName = (id: string): string =>
    users.find((user) => user.id === id)?.full_name ?? id.slice(0, 8);

  const openCreate = (): void => {
    setEditingInspection(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
          <p className="text-sm text-muted-foreground">
            Assign, review, and track inspection work.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Assign inspection
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search inspections"
                placeholder="Search by inspection title"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter inspections by status"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              aria-label="Filter inspections by site"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={siteFilter}
              onChange={(event) => {
                setSiteFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <Button type="submit">Search</Button>
          </form>

          {inspectionsQuery.isPending ? (
            <LoadingIndicator label="Loading inspections…" className="py-12" />
          ) : inspectionsQuery.isError ? (
            <ErrorState
              message={normalizeApiError(inspectionsQuery.error).message}
              onRetry={() => void inspectionsQuery.refetch()}
            />
          ) : inspections.length === 0 ? (
            <EmptyState
              title="No inspections found"
              description="Adjust the filters or assign a new inspection."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspection</TableHead>
                    <TableHead className="hidden md:table-cell">Site</TableHead>
                    <TableHead className="hidden lg:table-cell">Inspector</TableHead>
                    <TableHead className="hidden lg:table-cell">Checklist</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.title}</TableCell>
                      <TableCell className="hidden md:table-cell">{siteName(inspection.site_id)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {inspectorName(inspection.assigned_to)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {templateLabel(inspection)}
                      </TableCell>
                      <TableCell>{formatDateTime(inspection.scheduled_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[inspection.status]}>
                          {inspection.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsInspection(inspection)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={inspection.status !== 'ASSIGNED'}
                            onClick={() => {
                              setEditingInspection(inspection);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pagination && pagination.total_pages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} inspections
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.total_pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <InspectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        inspection={editingInspection}
      />

      <Dialog
        open={Boolean(detailsInspection)}
        onOpenChange={(open) => !open && setDetailsInspection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailsInspection?.title}</DialogTitle>
            <DialogDescription>Assignment details and current server state.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <DetailRow label="Site" value={detailsInspection ? siteName(detailsInspection.site_id) : ''} />
            <DetailRow
              label="Inspector"
              value={detailsInspection ? inspectorName(detailsInspection.assigned_to) : ''}
            />
            <DetailRow
              label="Checklist"
              value={detailsInspection ? templateLabel(detailsInspection) : ''}
            />
            <DetailRow
              label="Scheduled"
              value={formatDateTime(detailsInspection?.scheduled_at)}
            />
            <DetailRow label="Due" value={formatDateTime(detailsInspection?.due_at)} />
            <DetailRow label="Version" value={`v${detailsInspection?.version ?? ''}`} />
            <DetailRow
              label="Instructions"
              value={detailsInspection?.instructions || 'No instructions supplied.'}
            />
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsInspection(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
