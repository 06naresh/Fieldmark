import { Link } from 'react-router-dom';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ROUTES } from '@/lib/constants';

export function LoginPage(): React.JSX.Element {
  return (
    <AuthLayout title="Sign in to Fieldmark" description="Use your account to continue to your workspace.">
      <div className="space-y-5">
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Need an inspector account?{' '}
          <Link to={ROUTES.signup} className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
