import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toDateTimeLocal, toIsoString } from '@/lib/date';
import { normalizeApiError } from '@/lib/error';
import { zodResolver } from '@/lib/formResolver';
import { checklistsApi } from '@/services/api/checklistsApi';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { sitesApi } from '@/services/api/sitesApi';
import { usersApi } from '@/services/api/usersApi';
import type { Inspection } from '@/types/entities';
import {
  createInspectionFormSchema,
  type InspectionFormValues,
} from '@/features/inspections/schemas/inspectionSchemas';

interface InspectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: Inspection | null;
}

export function InspectionFormDialog({
  open,
  onOpenChange,
  inspection,
}: InspectionFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const schema = useMemo(() => createInspectionFormSchema(inspection ? 'edit' : 'create'), [inspection]);

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      site_id: '',
      template_id: '',
      template_version: undefined,
      assigned_to: '',
      title: '',
      instructions: '',
      scheduled_at: '',
      due_at: '',
      version: 1,
    },
  });

  const sitesQuery = useQuery({
    queryKey: ['sites', 'assignment-options'],
    queryFn: () => sitesApi.list({ page: 1, page_size: 100, is_active: true }),
    enabled: open && !inspection,
  });

  const templatesQuery = useQuery({
    queryKey: ['checklists', 'assignment-options'],
    queryFn: () => checklistsApi.list({ page: 1, page_size: 100, is_active: true }),
    enabled: open && !inspection,
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'inspector-options'],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
    enabled: open && !inspection,
  });

  const sites = useMemo(() => sitesQuery.data?.data ?? [], [sitesQuery.data?.data]);
  const templates = useMemo(
    () => templatesQuery.data?.data ?? [],
    [templatesQuery.data?.data],
  );
  const inspectors = useMemo(
    () =>
      (usersQuery.data?.data ?? []).filter(
        (user) => user.is_active && user.role === 'INSPECTOR',
      ),
    [usersQuery.data?.data],
  );

  const templateId = form.watch('template_id');

  useEffect(() => {
    setErrorMessage(null);
    form.reset({
      site_id: inspection?.site_id ?? '',
      template_id: inspection?.template_id ?? '',
      template_version: inspection?.template_version,
      assigned_to: inspection?.assigned_to ?? '',
      title: inspection?.title ?? '',
      instructions: inspection?.instructions ?? '',
      scheduled_at: toDateTimeLocal(inspection?.scheduled_at),
      due_at: toDateTimeLocal(inspection?.due_at),
      version: inspection?.version ?? 1,
    });
  }, [form, inspection, open]);

  useEffect(() => {
    if (inspection) {
      return;
    }

    const selected = templates.find((template) => template.id === templateId);
    form.setValue('template_version', selected?.template_version, {
      shouldValidate: Boolean(templateId),
    });
  }, [form, inspection, templateId, templates]);

  const mutation = useMutation({
    mutationFn: async (values: InspectionFormValues) => {
      if (inspection) {
        return inspectionsApi.update(inspection.id, {
          title: values.title,
          instructions: values.instructions?.trim() || null,
          scheduled_at: toIsoString(values.scheduled_at ?? ''),
          due_at: toIsoString(values.due_at ?? ''),
          version: values.version ?? inspection.version,
        });
      }

      return inspectionsApi.create({
        site_id: values.site_id ?? '',
        template_id: values.template_id ?? '',
        template_version: values.template_version ?? 0,
        assigned_to: values.assigned_to ?? '',
        title: values.title,
        instructions: values.instructions?.trim() || null,
        scheduled_at: toIsoString(values.scheduled_at ?? ''),
        due_at: toIsoString(values.due_at ?? ''),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inspections'] });
      toast({
        title: inspection ? 'Inspection updated' : 'Inspection assigned',
        variant: 'success',
      });
      onOpenChange(false);
    },
    onError: (error) => setErrorMessage(normalizeApiError(error).message),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));
  const optionsLoading =
    !inspection && (sitesQuery.isPending || templatesQuery.isPending || usersQuery.isPending);
  const optionsError =
    !inspection && (sitesQuery.isError || templatesQuery.isError || usersQuery.isError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspection ? 'Edit assignment' : 'Assign inspection'}</DialogTitle>
          <DialogDescription>
            {inspection
              ? 'Update the schedule and instructions. The assigned site, template revision, and inspector stay fixed.'
              : 'Assign an active checklist revision to an active inspector.'}
          </DialogDescription>
        </DialogHeader>

        {optionsLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading assignment options…</p>
        ) : optionsError ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Assignment options could not be loaded. Check your connection and try again.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="inspection-title">Title</Label>
              <Input id="inspection-title" {...form.register('title')} />
              {form.formState.errors.title ? (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inspection-site">Site</Label>
                <select
                  id="inspection-site"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  disabled={Boolean(inspection)}
                  {...form.register('site_id')}
                >
                  <option value="">Select a site</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.site_code})
                    </option>
                  ))}
                </select>
                {form.formState.errors.site_id ? (
                  <p className="text-sm text-destructive">{form.formState.errors.site_id.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspection-template">Checklist template</Label>
                <select
                  id="inspection-template"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  disabled={Boolean(inspection)}
                  {...form.register('template_id')}
                >
                  <option value="">Select a template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · v{template.template_version}
                    </option>
                  ))}
                </select>
                {form.formState.errors.template_id ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.template_id.message}
                  </p>
                ) : null}
                <input
                  type="hidden"
                  {...form.register('template_version', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection-assignee">Inspector</Label>
              <select
                id="inspection-assignee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                disabled={Boolean(inspection)}
                {...form.register('assigned_to')}
              >
                <option value="">Select an inspector</option>
                {inspectors.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} · {user.email}
                  </option>
                ))}
              </select>
              {form.formState.errors.assigned_to ? (
                <p className="text-sm text-destructive">{form.formState.errors.assigned_to.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inspection-scheduled">Scheduled at</Label>
                <Input id="inspection-scheduled" type="datetime-local" {...form.register('scheduled_at')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspection-due">Due at</Label>
                <Input id="inspection-due" type="datetime-local" {...form.register('due_at')} />
                {form.formState.errors.due_at ? (
                  <p className="text-sm text-destructive">{form.formState.errors.due_at.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspection-instructions">Instructions</Label>
              <Textarea id="inspection-instructions" {...form.register('instructions')} />
            </div>

            {inspection ? (
              <input type="hidden" {...form.register('version', { valueAsNumber: true })} />
            ) : null}

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
                {mutation.isPending
                  ? 'Saving…'
                  : inspection
                    ? 'Save changes'
                    : 'Assign inspection'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
