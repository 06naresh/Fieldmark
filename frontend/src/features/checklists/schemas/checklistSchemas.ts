import { z } from 'zod';
import type { ChecklistTemplatePayload } from '@/types/entities';

export const responseTypes = [
  'YES_NO',
  'TEXT',
  'NUMBER',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
] as const;

const choiceTypes = new Set<string>(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']);

export function createChecklistFormSchema() {
  return z
    .object({
      name: z.string().trim().min(1, 'Template name is required.').max(200),
      description: z.string().trim().optional(),
      items: z
        .array(
          z.object({
            question: z.string().trim().min(1, 'Question is required.'),
            description: z.string().trim().optional(),
            response_type: z.enum(responseTypes),
            is_required: z.boolean(),
            optionsText: z.string().trim().optional(),
          }),
        )
        .min(1, 'Add at least one checklist item.'),
    })
    .superRefine((values, context) => {
      values.items.forEach((item, index) => {
        if (choiceTypes.has(item.response_type) && !parseChoices(item.optionsText).length) {
          context.addIssue({
            code: 'custom',
            path: ['items', index, 'optionsText'],
            message: 'Add at least one choice, separated by commas or new lines.',
          });
        }
      });
    });
}

export type ChecklistFormValues = z.input<ReturnType<typeof createChecklistFormSchema>>;

function parseChoices(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\n,]/)
    .map((choice) => choice.trim())
    .filter(Boolean);
}

export function buildTemplatePayload(values: ChecklistFormValues): ChecklistTemplatePayload {
  return {
    name: values.name,
    description: values.description?.trim() || null,
    items: values.items.map((item, index) => ({
      question: item.question,
      description: item.description?.trim() || null,
      response_type: item.response_type,
      is_required: item.is_required,
      display_order: index + 1,
      options: choiceTypes.has(item.response_type)
        ? { choices: parseChoices(item.optionsText) }
        : null,
    })),
  };
}
