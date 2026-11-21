import type { AnswerValue, ChecklistItem } from '@/types/entities';
import type { SavedAnswerSnapshot } from '@/features/inspections/types/inspectionWorkflow';
import { hasAnswerValue } from '@/features/inspections/schemas/inspectionExecutionSchemas';

export function getChecklistChoices(item: ChecklistItem): string[] {
  if (!item.options) {
    return [];
  }

  const source = item.options.choices ?? item.options.options;
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((choice: unknown) => {
      if (typeof choice === 'string') {
        return choice.trim();
      }
      if (typeof choice === 'object' && choice !== null && 'value' in choice) {
        return String((choice as { value: unknown }).value).trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function sameSavedAnswer(
  snapshot: SavedAnswerSnapshot | undefined,
  value: AnswerValue,
  notes: string,
): boolean {
  if (!snapshot) {
    return false;
  }
  return JSON.stringify(snapshot.value) === JSON.stringify(value) && snapshot.notes === notes;
}

export function hasPendingAnswerChanges(
  items: ChecklistItem[],
  values: Record<string, AnswerValue>,
  notes: Record<string, string>,
  serverAnswers: Record<string, SavedAnswerSnapshot>,
): boolean {
  return items.some((item) => {
    const value = values[item.id] ?? null;
    const note = notes[item.id] ?? '';
    return hasAnswerValue(value) && !sameSavedAnswer(serverAnswers[item.id], value, note);
  });
}

export function formatAnswerValue(value: AnswerValue): string {
  if (!hasAnswerValue(value)) {
    return 'No answer';
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}
