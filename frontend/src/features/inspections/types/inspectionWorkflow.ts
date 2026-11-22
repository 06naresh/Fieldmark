import { createId } from '@/lib/id';
import type {
  AnswerValue,
  InspectionDetail,
  OverallStatus,
} from '@/types/entities';

export interface ExecutionFormValues {
  answers: Record<string, AnswerValue>;
  notes: Record<string, string>;
  summary: string;
  overallStatus: OverallStatus | '';
}

export interface SavedAnswerSnapshot {
  value: AnswerValue;
  notes: string;
}

export interface StoredInspectionDraft {
  inspectionId: string;
  ownerId: string;
  values: ExecutionFormValues;
  inspectionVersion: number;
  answerVersions: Record<string, number>;
  serverAnswers: Record<string, SavedAnswerSnapshot>;
  submissionId: string;
  updatedAt: string;
  localSavedAt: string | null;
  lastServerSavedAt: string | null;
}

export function createExecutionFormValues(detail: InspectionDetail): ExecutionFormValues {
  const answers: Record<string, AnswerValue> = {};
  const notes: Record<string, string> = {};

  for (const item of detail.checklist_items) {
    const answer = detail.answers.find((candidate) => candidate.checklist_item_id === item.id);
    answers[item.id] = answer?.answer_value ?? null;
    notes[item.id] = answer?.notes ?? '';
  }

  return {
    answers,
    notes,
    summary: '',
    overallStatus: '',
  };
}

export function createAnswerVersions(detail: InspectionDetail): Record<string, number> {
  const versions: Record<string, number> = {};
  for (const answer of detail.answers) {
    versions[answer.checklist_item_id] = answer.version;
  }
  return versions;
}

export function createServerAnswers(detail: InspectionDetail): Record<string, SavedAnswerSnapshot> {
  const snapshots: Record<string, SavedAnswerSnapshot> = {};
  for (const answer of detail.answers) {
    snapshots[answer.checklist_item_id] = {
      value: answer.answer_value,
      notes: answer.notes ?? '',
    };
  }
  return snapshots;
}

/** Submission IDs are validated as UUIDs by the synchronization API. */
export function createSubmissionId(): string {
  return createId();
}

export function createStoredDraft(detail: InspectionDetail, ownerId: string): StoredInspectionDraft {
  return {
    inspectionId: detail.id,
    ownerId,
    values: createExecutionFormValues(detail),
    inspectionVersion: detail.version,
    answerVersions: createAnswerVersions(detail),
    serverAnswers: createServerAnswers(detail),
    submissionId: createSubmissionId(),
    updatedAt: new Date().toISOString(),
    localSavedAt: new Date().toISOString(),
    lastServerSavedAt: null,
  };
}
