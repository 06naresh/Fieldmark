import { Link } from 'react-router-dom';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { ROUTES } from '@/lib/constants';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps): React.JSX.Element {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description ?? 'This screen will be implemented in a later development phase.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge variant="outline">Foundation placeholder</Badge>
          <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" to={ROUTES.home}>
            Return home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
