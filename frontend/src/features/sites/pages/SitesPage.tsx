import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  toast,
} from '@/components/ui';
import { normalizeApiError } from '@/lib/error';
import { sitesApi } from '@/services/api/sitesApi';
import type { Site } from '@/types/entities';
import { SiteFormDialog } from '@/features/sites/components/SiteFormDialog';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function SitesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [confirmSite, setConfirmSite] = useState<Site | null>(null);

  const sitesQuery = useQuery({
    queryKey: ['sites', { page, search, statusFilter }],
    queryFn: () =>
      sitesApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ site, isActive }: { site: Site; isActive: boolean }) =>
      sitesApi.setStatus(site.id, isActive, site.version),
    onSuccess: async (_site, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      setConfirmSite(null);
      toast({ title: variables.isActive ? 'Site activated' : 'Site deactivated', variant: 'success' });
    },
    onError: (error) => {
      setConfirmSite(null);
      toast({
        title: 'Could not update site',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  const sites = sitesQuery.data?.data ?? [];
  const pagination = sitesQuery.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sites</h1>
          <p className="text-sm text-muted-foreground">Manage inspection locations.</p>
        </div>
        <Button
          onClick={() => {
            setEditingSite(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add site
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
              setPage(1);
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search sites"
                placeholder="Search by name, code, or address"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter sites by status"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <Button type="submit">Search</Button>
          </form>

          {sitesQuery.isPending ? (
            <LoadingIndicator label="Loading sites…" className="py-12" />
          ) : sitesQuery.isError ? (
            <ErrorState
              message={normalizeApiError(sitesQuery.error).message}
              onRetry={() => void sitesQuery.refetch()}
            />
          ) : sites.length === 0 ? (
            <EmptyState title="No sites found" description="Adjust the filters or create a site." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.site_code}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {[site.city, site.state, site.country].filter(Boolean).join(', ') || site.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={site.is_active ? 'success' : 'secondary'}>
                          {site.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>v{site.version}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingSite(site);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              if (site.is_active) {
                                setConfirmSite(site);
                              } else {
                                statusMutation.mutate({ site, isActive: true });
                              }
                            }}
                          >
                            {site.is_active ? 'Deactivate' : 'Activate'}
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} sites
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

      <SiteFormDialog open={formOpen} onOpenChange={setFormOpen} site={editingSite} />

      <Dialog open={Boolean(confirmSite)} onOpenChange={(open) => !open && setConfirmSite(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate site?</DialogTitle>
            <DialogDescription>
              {confirmSite?.name} will no longer be available for new assignments. Existing
              inspections remain valid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSite(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirmSite) {
                  statusMutation.mutate({ site: confirmSite, isActive: false });
                }
              }}
            >
              {statusMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
