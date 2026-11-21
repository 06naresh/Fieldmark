import { LoginForm } from '@/features/auth/components/LoginForm';
import { AuthLayout } from '@/layouts/AuthLayout';

export function LoginPage(): React.JSX.Element {
  return (
    <AuthLayout title="Sign in to Fieldmark" description="Use your account to continue to your workspace.">
      <LoginForm />
    </AuthLayout>
  );
}
