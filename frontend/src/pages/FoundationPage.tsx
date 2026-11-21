import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ROUTES } from '@/lib/constants';

export function FoundationPage(): React.JSX.Element {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Phase 6</Badge>
          <CardTitle className="mt-3 text-2xl">Fieldmark foundation is ready</CardTitle>
          <CardDescription>
            The React application shell, routing, theming, shared components, API client, and test tooling are configured.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={ROUTES.admin.dashboard}>Open admin dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={ROUTES.inspector.dashboard}>Open inspector dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
