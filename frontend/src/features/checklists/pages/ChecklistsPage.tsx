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
import { checklistsApi } from '@/services/api/checklistsApi';
import type { ChecklistTemplate } from '@/types/entities';
import { ChecklistFormDialog } from '@/features/checklists/components/ChecklistFormDialog';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function ChecklistsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [detailsTemplate, setDetailsTemplate] = useState<ChecklistTemplate | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<ChecklistTemplate | null>(null);

  const templatesQuery = useQuery({
    queryKey: ['checklists', { page, search, statusFilter }],
    queryFn: () =>
      checklistsApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ template, isActive }: { template: ChecklistTemplate; isActive: boolean }) =>
      checklistsApi.setStatus(template.id, isActive),
    onSuccess: async (_template, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['checklists'] });
      setConfirmTemplate(null);
      toast({
        title: variables.isActive ? 'Template activated' : 'Template deactivated',
        variant: 'success',
      });
    },
    onError: (error) => {
      setConfirmTemplate(null);
      toast({
        title: 'Could not update template',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  const templates = templatesQuery.data?.data ?? [];
  const pagination = templatesQuery.data?.pagination;

  const openCreate = (): void => {
    setEditingTemplate(null);
    setFormOpen(true);
  };

  const openRevision = (template: ChecklistTemplate): void => {
    setEditingTemplate(template);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checklists</h1>
          <p className="text-sm text-muted-foreground">Create and publish inspection templates.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create template
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
                aria-label="Search checklists"
                placeholder="Search templates"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <select
              aria-label="Filter checklists by status"
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

          {templatesQuery.isPending ? (
            <LoadingIndicator label="Loading checklist templates…" className="py-12" />
          ) : templatesQuery.isError ? (
            <ErrorState
              message={normalizeApiError(templatesQuery.error).message}
              onRetry={() => void templatesQuery.refetch()}
            />
          ) : templates.length === 0 ? (
            <EmptyState
              title="No templates found"
              description="Adjust the filters or create a checklist template."
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Revision</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <p className="font-medium">{template.name}</p>
                        {template.description ? (
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>v{template.template_version}</TableCell>
                      <TableCell>{template.items.length}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? 'success' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsTemplate(template)}
                          >
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openRevision(template)}>
                            New revision
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              if (template.is_active) {
                                setConfirmTemplate(template);
                              } else {
                                statusMutation.mutate({ template, isActive: true });
                              }
                            }}
                          >
                            {template.is_active ? 'Deactivate' : 'Activate'}
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} templates
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

      <ChecklistFormDialog open={formOpen} onOpenChange={setFormOpen} template={editingTemplate} />

      <Dialog
        open={Boolean(detailsTemplate)}
        onOpenChange={(open) => !open && setDetailsTemplate(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detailsTemplate?.name}</DialogTitle>
            <DialogDescription>
              Version {detailsTemplate?.template_version} · {detailsTemplate?.items.length} items
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            {detailsTemplate?.items.map((item, index) => (
              <li key={item.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">
                  {index + 1}. {item.question}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.response_type.replace(/_/g, ' ')} · {item.is_required ? 'Required' : 'Optional'}
                </p>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsTemplate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmTemplate)} onOpenChange={(open) => !open && setConfirmTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate template?</DialogTitle>
            <DialogDescription>
              {confirmTemplate?.name} will not be available for new assignments. Existing inspections
              keep this revision.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTemplate(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirmTemplate) {
                  statusMutation.mutate({ template: confirmTemplate, isActive: false });
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
