import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, CloudOff, Play, Save, Send } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Label,
  LoadingIndicator,
  Textarea,
  toast,
} from '@/components/ui';
import { ROUTES } from '@/lib/constants';
import { normalizeApiError } from '@/lib/error';
import { zodResolver } from '@/lib/formResolver';
import { inspectionsApi } from '@/services/api/inspectionsApi';
import { useAuthStore } from '@/store/authStore';
import type { ChecklistItem, OverallStatus } from '@/types/entities';
import { ChecklistAnswerField } from '@/features/inspections/components/ChecklistAnswerField';
import {
  calculateProgress,
  createExecutionSchema,
  hasAnswerValue,
  overallStatuses,
  overallStatusLabels,
} from '@/features/inspections/schemas/inspectionExecutionSchemas';
import {
  inspectionDraftKey,
  readInspectionDraft,
  useInspectionDraftStore,
} from '@/features/inspections/store/inspectionDraftStore';
import {
  createStoredDraft,
  type ExecutionFormValues,
  type StoredInspectionDraft,
} from '@/features/inspections/types/inspectionWorkflow';
import { sameSavedAnswer } from '@/features/inspections/utils/inspectionAnswers';

type SyncState = 'idle' | 'local' | 'saving' | 'synced' | 'failed';

const EMPTY_ITEMS: ChecklistItem[] = [];

function getErrorMessage(error: { message?: unknown } | undefined): string | undefined {
  return typeof error?.message === 'string' ? error.message : undefined;
}

function formatSavedTime(value: string | null): string {
  if (!value) {
    return 'Not saved yet';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

export function ExecuteInspectionPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const ownerId = currentUser?.id ?? 'anonymous';
  const draftKey = inspectionDraftKey(ownerId, id);
  const setDraft = useInspectionDraftStore((state) => state.setDraft);
  const clearDraft = useInspectionDraftStore((state) => state.clearDraft);
  const draft = useInspectionDraftStore((state) => state.drafts[draftKey]);

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initializedKey = useRef<string | null>(null);

  const detail = useQuery({
    queryKey: ['inspection', id, 'detail'],
    queryFn: () => inspectionsApi.detail(id),
    enabled: id.length > 0,
  });

  const items = detail.data?.checklist_items ?? EMPTY_ITEMS;
  const executionSchema = useMemo(() => createExecutionSchema(items), [items]);
  const form = useForm<ExecutionFormValues>({
    resolver: zodResolver<ExecutionFormValues>(executionSchema),
    defaultValues: { answers: {}, notes: {}, summary: '', overallStatus: '' },
    mode: 'onSubmit',
  });

  const start = useMutation({
    mutationFn: (version: number) => inspectionsApi.start(id, version),
    onSuccess: async (result) => {
      queryClient.setQueryData(['inspection', id, 'detail'], (previous: unknown) => {
        if (!previous || typeof previous !== 'object') {
          return previous;
        }
        return { ...previous, status: result.status, version: result.version };
      });
      const existing = readInspectionDraft(draftKey);
      if (existing) {
        setDraft(draftKey, { ...existing, inspectionVersion: result.version });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspections'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      ]);
      toast({
        title: 'Inspection started',
        description: 'The checklist is ready for answers.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Could not start inspection',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!detail.data || initializedKey.current === draftKey) {
      return;
    }

    const existing = readInspectionDraft(draftKey);
    if (existing) {
      form.reset(existing.values);
      if (existing.inspectionVersion !== detail.data.version) {
        setDraft(draftKey, {
          ...existing,
          inspectionVersion: detail.data.version,
        });
      }
    } else {
      const draftValues = createStoredDraft(detail.data, ownerId);
      setDraft(draftKey, draftValues);
      form.reset(draftValues.values);
    }

    initializedKey.current = draftKey;
  }, [detail.data, draftKey, form, ownerId, setDraft]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const current = readInspectionDraft(draftKey);
      if (!current) {
        return;
      }
      const timestamp = new Date().toISOString();
      setDraft(draftKey, {
        ...current,
        values: values as ExecutionFormValues,
        updatedAt: timestamp,
        localSavedAt: timestamp,
      });
      setSyncState('local');
      setSyncError(null);
    });

    return () => subscription.unsubscribe();
  }, [draftKey, form, setDraft]);

  if (!id) {
    return <ErrorState message="No inspection was selected." />;
  }

  if (detail.isLoading) {
    return <LoadingIndicator label="Loading checklist…" />;
  }

  if (detail.error || !detail.data) {
    return (
      <ErrorState
        message={detail.error ? normalizeApiError(detail.error).message : 'Inspection not found.'}
        onRetry={() => void detail.refetch()}
      />
    );
  }

  const inspection = detail.data;

  if (currentUser && inspection.assigned_to !== currentUser.id) {
    return <ErrorState message="You are not assigned to this inspection." />;
  }

  if (inspection.status === 'ASSIGNED') {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={ROUTES.inspector.inspectionDetails(id)}>
            <ArrowLeft className="h-4 w-4" />
            Back to inspection details
          </Link>
        </Button>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>{inspection.title}</CardTitle>
            <CardDescription>
              Start the inspection before entering answers. This records the assigned checklist
              revision and creates an editable draft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => start.mutate(inspection.version)} disabled={start.isPending}>
              <Play className="h-4 w-4" />
              {start.isPending ? 'Starting…' : 'Start inspection'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inspection.status !== 'IN_PROGRESS') {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={ROUTES.inspector.inspectionDetails(id)}>
            <ArrowLeft className="h-4 w-4" />
            Back to inspection details
          </Link>
        </Button>
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Inspection is read-only</CardTitle>
            <CardDescription>
              This inspection is {inspection.status.toLowerCase()} and can no longer be edited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to={ROUTES.inspector.inspectionDetails(id)}>View inspection details</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentValues = form.watch();
  const progress = calculateProgress(items, currentValues.answers ?? {});
  const isSaving = syncState === 'saving';

  async function persistAnswers(values: ExecutionFormValues): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const current = readInspectionDraft(draftKey);
    const workingDraft: StoredInspectionDraft = current
      ? {
          ...current,
          values,
          inspectionVersion: inspection.version,
          updatedAt: timestamp,
          localSavedAt: timestamp,
        }
      : {
          ...createStoredDraft(inspection, ownerId),
          values,
          inspectionVersion: inspection.version,
          updatedAt: timestamp,
          localSavedAt: timestamp,
        };

    // Local persistence happens before any network request.
    setDraft(draftKey, workingDraft);
    setSyncState('saving');
    setSyncError(null);

    const answerVersions = { ...workingDraft.answerVersions };
    const serverAnswers = { ...workingDraft.serverAnswers };
    const errors: string[] = [];

    for (const item of items) {
      const value = values.answers[item.id] ?? null;
      const notes = values.notes[item.id] ?? '';
      if (!hasAnswerValue(value) || sameSavedAnswer(serverAnswers[item.id], value, notes)) {
        continue;
      }

      try {
        const answer = await inspectionsApi.saveAnswer(id, item.id, {
          answer_value: value,
          notes,
          base_version: answerVersions[item.id] ?? 1,
        });
        answerVersions[item.id] = answer.version;
        serverAnswers[item.id] = { value, notes };
      } catch (error) {
        errors.push(`${item.question}: ${normalizeApiError(error).message}`);
      }
    }

    setDraft(draftKey, {
      ...workingDraft,
      answerVersions,
      serverAnswers,
      lastServerSavedAt: errors.length === 0 ? new Date().toISOString() : workingDraft.lastServerSavedAt,
    });

    if (errors.length > 0) {
      setSyncState('failed');
      setSyncError(errors.join(' '));
      toast({
        title: 'Saved on this device',
        description: 'Some answers could not be confirmed by the server. They remain saved locally.',
        variant: 'warning',
      });
      return false;
    }

    setSyncState('synced');
    return true;
  }

  const onSaveDraft = form.handleSubmit(async (values) => {
    const saved = await persistAnswers(values);
    if (saved) {
      toast({
        title: 'Draft saved',
        description: 'Answers are saved on this device and confirmed by the server.',
        variant: 'success',
      });
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!overallStatuses.some((status) => status === values.overallStatus)) {
      form.setError('overallStatus', { message: 'Select an overall result.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await persistAnswers(values);
      if (!saved) {
        return;
      }

      const current = readInspectionDraft(draftKey);
      const result = await inspectionsApi.submit(id, {
        summary: values.summary.trim() || null,
        overall_status: values.overallStatus as OverallStatus,
        version: inspection.version,
        submission_id: current?.submissionId ?? createStoredDraft(inspection, ownerId).submissionId,
      });

      clearDraft(draftKey);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspections'] }),
        queryClient.invalidateQueries({ queryKey: ['inspection', id, 'detail'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      ]);
      toast({
        title: 'Inspection submitted',
        description: `Submission #${result.submission_number} was confirmed.`,
        variant: 'success',
      });
      navigate(ROUTES.inspector.inspectionDetails(id));
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: normalizeApiError(error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  const syncLabel =
    syncState === 'saving'
      ? 'Saving answers…'
      : syncState === 'failed'
        ? 'Saved locally — server confirmation failed'
        : syncState === 'synced'
          ? 'Saved locally and confirmed by server'
          : syncState === 'local'
            ? 'Saved on this device — waiting to sync'
            : draft?.lastServerSavedAt
              ? 'Saved locally and confirmed by server'
              : 'Changes are saved as you type';

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={ROUTES.inspector.inspectionDetails(id)}>
            <ArrowLeft className="h-4 w-4" />
            Back to inspection details
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Execute inspection</h1>
            <p className="mt-1 text-muted-foreground">{inspection.title}</p>
          </div>
          <div className="rounded-md border px-4 py-2 text-sm">
            <p className="font-medium">
              {progress.answered} of {progress.total} items answered
            </p>
            <p className="text-muted-foreground">Version {inspection.version}</p>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-2 pt-6">
            <div
              className="flex items-center justify-between text-sm font-medium"
              aria-label={`Checklist progress ${progress.percentage}%`}
            >
              <span>Checklist progress</span>
              <span>{progress.percentage}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percentage}
            >
              <div className="h-full bg-primary transition-all" style={{ width: `${progress.percentage}%` }} />
            </div>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No checklist items</CardTitle>
              <CardDescription>This template revision contains no questions.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-4">
            {items
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((item, index) => (
                <ChecklistAnswerField
                  key={item.id}
                  item={item}
                  index={index}
                  errorMessage={getErrorMessage(form.formState.errors.answers?.[item.id])}
                />
              ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Overall assessment</CardTitle>
            <CardDescription>Summarize the inspection before submission.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="overall-status">Overall result</Label>
              <select
                id="overall-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register('overallStatus')}
                aria-invalid={Boolean(form.formState.errors.overallStatus)}
              >
                <option value="">Select a result</option>
                {overallStatuses.map((status) => (
                  <option key={status} value={status}>
                    {overallStatusLabels[status]}
                  </option>
                ))}
              </select>
              {form.formState.errors.overallStatus ? (
                <p className="text-sm text-destructive">
                  {getErrorMessage(form.formState.errors.overallStatus)}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspection-summary">Summary</Label>
              <Textarea
                id="inspection-summary"
                rows={4}
                placeholder="Optional observations or corrective actions"
                {...form.register('summary')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                {syncState === 'failed' ? (
                  <CloudOff className="h-4 w-4 text-warning" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                Local save status
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{syncLabel}</p>
              <p className="text-xs text-muted-foreground">
                Last local save: {formatSavedTime(draft?.localSavedAt ?? null)}
              </p>
              {syncError ? <p className="mt-1 text-sm text-destructive">{syncError}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void onSaveDraft()} disabled={isSaving || isSubmitting}>
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button type="submit" disabled={isSaving || isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Submitting…' : 'Submit inspection'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
}
