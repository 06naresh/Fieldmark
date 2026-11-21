import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';

export function ProfilePage(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Your Fieldmark account information.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>Information provided by your administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4 text-sm">
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Full name</dt>
              <dd className="font-medium">{user?.full_name ?? '—'}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user?.email ?? '—'}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium capitalize">{user?.role.toLowerCase() ?? '—'}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <dt className="text-muted-foreground">Account status</dt>
              <dd>
                <Badge variant={user?.is_active ? 'success' : 'secondary'}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
