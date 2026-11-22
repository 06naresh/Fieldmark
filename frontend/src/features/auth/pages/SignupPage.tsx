import { Link } from 'react-router-dom';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ROUTES } from '@/lib/constants';

export function SignupPage(): React.JSX.Element {
  return (
    <AuthLayout
      title="Create your account"
      description="Register as an inspector to access assigned field work."
    >
      <div className="space-y-5">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
