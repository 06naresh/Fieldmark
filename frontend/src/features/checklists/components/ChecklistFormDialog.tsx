import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
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
import { checklistsApi } from '@/services/api/checklistsApi';
import type { ChecklistTemplate, ResponseType } from '@/types/entities';
import {
  buildTemplatePayload,
  createChecklistFormSchema,
  responseTypes,
  type ChecklistFormValues,
} from '@/features/checklists/schemas/checklistSchemas';

interface ChecklistFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChecklistTemplate | null;
}

const responseLabels: Record<ResponseType, string> = {
  YES_NO: 'Yes / No',
  TEXT: 'Text',
  NUMBER: 'Number',
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_CHOICE: 'Multiple choice',
};

function optionsToText(options: Record<string, unknown> | null): string {
  if (!options) {
    return '';
  }
  const choices = options.choices;
  return Array.isArray(choices) ? choices.map(String).join(', ') : '';
}

export function ChecklistFormDialog({
  open,
  onOpenChange,
  template,
}: ChecklistFormDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const schema = createChecklistFormSchema();

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', items: [] },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    setErrorMessage(null);
    form.reset(
      template
        ? {
            name: template.name,
            description: template.description ?? '',
            items: template.items.map((item) => ({
              question: item.question,
              description: item.description ?? '',
              response_type: item.response_type,
              is_required: item.is_required,
              optionsText: optionsToText(item.options),
            })),
          }
        : {
            name: '',
            description: '',
            items: [
              {
                question: '',
                description: '',
                response_type: 'YES_NO',
                is_required: true,
                optionsText: '',
              },
            ],
          },
    );
  }, [form, open, template]);

  const mutation = useMutation({
    mutationFn: async (values: ChecklistFormValues) => {
      const payload = buildTemplatePayload(values);
      return template
        ? checklistsApi.createRevision(template.id, payload)
        : checklistsApi.create(payload);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['checklists'] });
      toast({
        title: template ? 'Revision published' : 'Template created',
        description: `${result.name} · version ${result.template_version}`,
        variant: 'success',
      });
      onOpenChange(false);
    },
    onError: (error) => setErrorMessage(normalizeApiError(error).message),
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Publish new revision' : 'Create checklist template'}</DialogTitle>
          <DialogDescription>
            Published revisions are immutable. Existing inspections keep their assigned revision.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template name</Label>
              <Input id="template-name" {...form.register('name')} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Input id="template-description" {...form.register('description')} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Checklist items</p>
                <p className="text-xs text-muted-foreground">Order is the order shown to inspectors.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    question: '',
                    description: '',
                    response_type: 'YES_NO',
                    is_required: true,
                    optionsText: '',
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            {form.formState.errors.items?.root ? (
              <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
            ) : null}

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Item {index + 1}</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      aria-label={`Move item ${index + 1} up`}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={index === fields.length - 1}
                      aria-label={`Move item ${index + 1} down`}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove item ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`item-question-${index}`}>Question</Label>
                  <Textarea id={`item-question-${index}`} {...form.register(`items.${index}.question`)} />
                  {form.formState.errors.items?.[index]?.question ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.items[index]?.question?.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`item-type-${index}`}>Answer type</Label>
                    <select
                      id={`item-type-${index}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      {...form.register(`items.${index}.response_type`)}
                    >
                      {responseTypes.map((type) => (
                        <option key={type} value={type}>
                          {responseLabels[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        {...form.register(`items.${index}.is_required`)}
                      />
                      Required answer
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`item-description-${index}`}>Help text (optional)</Label>
                  <Input id={`item-description-${index}`} {...form.register(`items.${index}.description`)} />
                </div>

                {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(
                  form.watch(`items.${index}.response_type`),
                ) ? (
                  <div className="space-y-2">
                    <Label htmlFor={`item-options-${index}`}>Choices</Label>
                    <Input
                      id={`item-options-${index}`}
                      placeholder="Pass, Fail, Not applicable"
                      {...form.register(`items.${index}.optionsText`)}
                    />
                    {form.formState.errors.items?.[index]?.optionsText ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.items[index]?.optionsText?.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
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
              {mutation.isPending ? 'Publishing…' : template ? 'Publish revision' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
