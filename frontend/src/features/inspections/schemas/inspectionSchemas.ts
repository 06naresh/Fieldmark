import { z } from 'zod';

export function createInspectionFormSchema(mode: 'create' | 'edit') {
  return z
    .object({
      site_id: z.string().optional(),
      template_id: z.string().optional(),
      template_version: z.number().int().min(1).optional(),
      assigned_to: z.string().optional(),
      title: z.string().trim().min(1, 'Title is required.').max(200),
      instructions: z.string().trim().optional(),
      scheduled_at: z.string().optional(),
      due_at: z.string().optional(),
      version: z.number().int().min(1).optional(),
    })
    .superRefine((values, context) => {
      if (mode === 'create') {
        if (!values.site_id) {
          context.addIssue({ code: 'custom', path: ['site_id'], message: 'Select a site.' });
        }
        if (!values.template_id) {
          context.addIssue({ code: 'custom', path: ['template_id'], message: 'Select a template.' });
        }
        if (!values.template_version) {
          context.addIssue({
            code: 'custom',
            path: ['template_version'],
            message: 'Select a template.',
          });
        }
        if (!values.assigned_to) {
          context.addIssue({ code: 'custom', path: ['assigned_to'], message: 'Select an inspector.' });
        }
      }

      if (mode === 'edit' && !values.version) {
        context.addIssue({ code: 'custom', path: ['version'], message: 'Version is required.' });
      }

      if (
        values.scheduled_at &&
        values.due_at &&
        new Date(values.due_at).getTime() < new Date(values.scheduled_at).getTime()
      ) {
        context.addIssue({
          code: 'custom',
          path: ['due_at'],
          message: 'Due date cannot be earlier than the scheduled date.',
        });
      }
    });
}

export type InspectionFormValues = z.input<ReturnType<typeof createInspectionFormSchema>>;
