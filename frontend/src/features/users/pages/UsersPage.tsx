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
import { usersApi } from '@/services/api/usersApi';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth';
import type { User } from '@/types/entities';
import { UserFormDialog } from '@/features/users/components/UserFormDialog';

type RoleFilter = 'ALL' | UserRole;
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export function UsersPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', { page, search }],
    queryFn: () =>
      usersApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.setStatus(id, isActive),
    onSuccess: async (_user, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmUser(null);
      toast({
        title: variables.isActive ? 'User activated' : 'User deactivated',
        variant: 'success',
      });
    },
    onError: (error) => {
      setConfirmUser(null);
      toast({
        title: 'Could not update user',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  const users =
    usersQuery.data?.data.filter((user) => roleFilter === 'ALL' || user.role === roleFilter) ?? [];
  const pagination = usersQuery.data?.pagination;

  const openCreate = (): void => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: User): void => {
    setEditingUser(user);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Create accounts and manage access.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add user
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
                aria-label="Search users"
                placeholder="Search by name or email"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <select
              aria-label="Filter by role"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value as RoleFilter);
                setPage(1);
              }}
            >
              <option value="ALL">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="INSPECTOR">Inspector</option>
            </select>

            <select
              aria-label="Filter by status"
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

          {usersQuery.isPending ? (
            <LoadingIndicator label="Loading users…" className="py-12" />
          ) : usersQuery.isError ? (
            <ErrorState
              message={normalizeApiError(usersQuery.error).message}
              onRetry={() => void usersQuery.refetch()}
            />
          ) : users.length === 0 ? (
            <EmptyState title="No users found" description="Adjust the filters or create a user." />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.role.toLowerCase()}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'success' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={user.id === currentUser?.id || statusMutation.isPending}
                            onClick={() => {
                              if (user.is_active) {
                                setConfirmUser(user);
                              } else {
                                statusMutation.mutate({ id: user.id, isActive: true });
                              }
                            }}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
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
                Page {pagination.page} of {pagination.total_pages} · {pagination.total} users
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

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editingUser} />

      <Dialog open={Boolean(confirmUser)} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
            <DialogDescription>
              {confirmUser?.full_name} will no longer be able to sign in or synchronize. This does not
              delete historical records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirmUser) {
                  statusMutation.mutate({ id: confirmUser.id, isActive: false });
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
