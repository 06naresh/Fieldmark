import { z, type ZodTypeAny } from 'zod';
import type { AnswerValue, ChecklistItem, OverallStatus } from '@/types/entities';

export const overallStatuses: OverallStatus[] = ['PASS', 'FAIL', 'NEEDS_REVIEW'];

export const overallStatusLabels: Record<OverallStatus, string> = {
  PASS: 'Pass',
  FAIL: 'Fail',
  NEEDS_REVIEW: 'Needs review',
};

export function hasAnswerValue(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return true;
}

function optionalSchemaForItem(item: ChecklistItem): ZodTypeAny {
  switch (item.response_type) {
    case 'YES_NO':
      return z.union([z.boolean(), z.null()]);
    case 'NUMBER':
      return z.union([z.number(), z.null()]);
    case 'MULTIPLE_CHOICE':
      return z.union([z.array(z.string()), z.null()]);
    case 'TEXT':
    case 'SINGLE_CHOICE':
    default:
      return z.union([z.string(), z.null()]);
  }
}

function answerSchemaForItem(item: ChecklistItem): ZodTypeAny {
  const schema = optionalSchemaForItem(item);
  if (!item.is_required) {
    return schema;
  }

  if (item.response_type === 'NUMBER') {
    return schema.refine(
      (value) => typeof value === 'number' && Number.isFinite(value),
      'This answer is required.',
    );
  }

  return schema.refine((value) => hasAnswerValue(value as AnswerValue), 'This answer is required.');
}

export function createExecutionSchema(items: ChecklistItem[]): ZodTypeAny {
  const answerSchemas: Record<string, ZodTypeAny> = {};
  for (const item of items) {
    answerSchemas[item.id] = answerSchemaForItem(item);
  }

  return z.object({
    answers: z.object(answerSchemas).passthrough(),
    notes: z.record(z.string(), z.string()),
    summary: z.string(),
    overallStatus: z
      .string()
      .refine(
        (value) => overallStatuses.some((status) => status === value),
        'Select an overall result.',
      ),
  });
}

export function calculateProgress(
  items: ChecklistItem[],
  answers: Record<string, AnswerValue>,
): { answered: number; total: number; percentage: number } {
  const total = items.length;
  const answered = items.filter((item) => hasAnswerValue(answers[item.id])).length;
  const percentage = total === 0 ? 0 : Math.round((answered / total) * 100);
  return { answered, total, percentage };
}
