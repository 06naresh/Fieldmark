import { useEffect, useState } from 'react';
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
  Textarea,
  toast,
} from '@/components/ui';
import { normalizeApiError } from '@/lib/error';
import { zodResolver } from '@/lib/formResolver';
import { sitesApi } from '@/services/api/sitesApi';
import type { Site } from '@/types/entities';
import { siteFormSchema, type SiteFormValues } from '@/features/sites/schemas/siteSchemas';

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
}

export function SiteFormDialog({ open, onOpenChange, site }: SiteFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      name: '',
      site_code: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      description: '',
      version: 1,
    },
  });

  useEffect(() => {
    setErrorMessage(null);
    form.reset({
      name: site?.name ?? '',
      site_code: site?.site_code ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      state: site?.state ?? '',
      postal_code: site?.postal_code ?? '',
      country: site?.country ?? '',
      description: site?.description ?? '',
      version: site?.version ?? 1,
    });
  }, [form, open, site]);

  const mutation = useMutation({
    mutationFn: async (values: SiteFormValues) => {
      const optional = (value: string | undefined): string | null => value?.trim() || null;

      if (site) {
        return sitesApi.update(site.id, {
          name: values.name,
          address: values.address,
          city: optional(values.city),
          state: optional(values.state),
          postal_code: optional(values.postal_code),
          country: optional(values.country),
          description: optional(values.description),
          version: values.version,
        });
      }

      return sitesApi.create({
        name: values.name,
        site_code: values.site_code,
        address: values.address,
        city: optional(values.city),
        state: optional(values.state),
        postal_code: optional(values.postal_code),
        country: optional(values.country),
        description: optional(values.description),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      toast({ title: site ? 'Site updated' : 'Site created', variant: 'success' });
      onOpenChange(false);
    },
    onError: (error) => setErrorMessage(normalizeApiError(error).message),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{site ? 'Edit site' : 'Create site'}</DialogTitle>
          <DialogDescription>
            Site details are used when assigning and executing inspections.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-name">Name</Label>
              <Input id="site-name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-code">Site code</Label>
              <Input id="site-code" disabled={Boolean(site)} {...form.register('site_code')} />
              {form.formState.errors.site_code ? (
                <p className="text-sm text-destructive">{form.formState.errors.site_code.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-address">Address</Label>
            <Input id="site-address" {...form.register('address')} />
            {form.formState.errors.address ? (
              <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-city">City</Label>
              <Input id="site-city" {...form.register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-state">State or region</Label>
              <Input id="site-state" {...form.register('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-postal">Postal code</Label>
              <Input id="site-postal" {...form.register('postal_code')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-country">Country</Label>
              <Input id="site-country" {...form.register('country')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-description">Description</Label>
            <Textarea id="site-description" {...form.register('description')} />
          </div>

          {site ? <input type="hidden" {...form.register('version', { valueAsNumber: true })} /> : null}

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
              {mutation.isPending ? 'Saving…' : site ? 'Save changes' : 'Create site'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
