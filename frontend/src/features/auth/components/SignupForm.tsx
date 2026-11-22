import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Label } from '@/components/ui';
import { dashboardForRole } from '@/lib/auth';
import { normalizeApiError } from '@/lib/error';
import { zodResolver } from '@/lib/formResolver';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas/signupSchema';
import { signUp } from '@/services/auth/session';
import type { SignupCredentials } from '@/types/auth';

export function SignupForm(): React.JSX.Element {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const signupMutation = useMutation({
    mutationFn: (credentials: SignupCredentials) => signUp(credentials),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    const credentials: SignupCredentials = {
      full_name: values.full_name,
      email: values.email,
      password: values.password,
    };

    try {
      const role = await signupMutation.mutateAsync(credentials);
      navigate(dashboardForRole(role), { replace: true });
    } catch (error) {
      setErrorMessage(normalizeApiError(error).message);
    }
  });

  const isSubmitting = signupMutation.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          type="text"
          autoComplete="name"
          placeholder="Sam Inspector"
          aria-invalid={Boolean(form.formState.errors.full_name)}
          aria-describedby={form.formState.errors.full_name ? 'full-name-error' : undefined}
          {...form.register('full_name')}
        />
        {form.formState.errors.full_name ? (
          <p id="full-name-error" className="text-sm text-destructive">
            {form.formState.errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email)}
          aria-describedby={form.formState.errors.email ? 'signup-email-error' : undefined}
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p id="signup-email-error" className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="pr-11"
            aria-invalid={Boolean(form.formState.errors.password)}
            aria-describedby={form.formState.errors.password ? 'signup-password-error' : undefined}
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.password ? (
          <p id="signup-password-error" className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          aria-describedby={form.formState.errors.confirmPassword ? 'confirm-password-error' : undefined}
          {...form.register('confirmPassword')}
        />
        {form.formState.errors.confirmPassword ? (
          <p id="confirm-password-error" className="text-sm text-destructive">
            {form.formState.errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create inspector account'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Public registration creates INSPECTOR accounts only. Administrator accounts are created by an administrator.
      </p>
    </form>
  );
}
