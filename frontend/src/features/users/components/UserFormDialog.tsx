import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@/components/ui';
import { zodResolver } from '@/lib/formResolver';
import { normalizeApiError } from '@/lib/error';
import { usersApi } from '@/services/api/usersApi';
import type { User } from '@/types/entities';
import { createUserFormSchema, type UserFormValues } from '@/features/users/schemas/userSchemas';

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mode = user ? 'edit' : 'create';
  const schema = useMemo(() => createUserFormSchema(mode), [mode]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'INSPECTOR',
    },
  });

  useEffect(() => {
    setErrorMessage(null);
    form.reset({
      full_name: user?.full_name ?? '',
      email: user?.email ?? '',
      password: '',
      role: user?.role ?? 'INSPECTOR',
    });
  }, [form, open, user]);

  const mutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (user) {
        return usersApi.update(user.id, {
          full_name: values.full_name,
          role: values.role,
        });
      }
      return usersApi.create({
        full_name: values.full_name,
        email: values.email,
        password: values.password ?? '',
        role: values.role,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: user ? 'User updated' : 'User created', variant: 'success' });
      onOpenChange(false);
    },
    onError: (error) => setErrorMessage(normalizeApiError(error).message),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? 'Edit user' : 'Create user'}</DialogTitle>
          <DialogDescription>
            {user
              ? 'Update the user name and role. Email addresses are immutable.'
              : 'Create an administrator or inspector account. The backend enforces all permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="user-full-name">Full name</Label>
            <Input id="user-full-name" {...form.register('full_name')} />
            {form.formState.errors.full_name ? (
              <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" disabled={Boolean(user)} {...form.register('email')} />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          {!user ? (
            <div className="space-y-2">
              <Label htmlFor="user-password">Temporary password</Label>
              <Input id="user-password" type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-role">Role</Label>
            <select
              id="user-role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register('role')}
            >
              <option value="INSPECTOR">Inspector</option>
              <option value="ADMIN">Admin</option>
            </select>
            {form.formState.errors.role ? (
              <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
            ) : null}
          </div>

          {errorMessage ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : user ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
