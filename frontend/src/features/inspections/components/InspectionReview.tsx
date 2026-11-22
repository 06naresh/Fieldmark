import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatDateTime } from '@/lib/date';
import { overallStatusLabels } from '@/features/inspections/schemas/inspectionExecutionSchemas';
import { formatAnswerValue } from '@/features/inspections/utils/inspectionAnswers';
import type { OverallStatus, InspectionDetail } from '@/types/entities';

interface InspectionReviewProps {
  detail: InspectionDetail;
}

const resultVariants: Record<OverallStatus, 'success' | 'destructive' | 'warning'> = {
  PASS: 'success',
  FAIL: 'destructive',
  NEEDS_REVIEW: 'warning',
};

/** Read-only rendering of saved answers, notes, and the submitted result. */
export function InspectionReview({ detail }: InspectionReviewProps): React.JSX.Element {
  const answersByItem = new Map(detail.answers.map((answer) => [answer.checklist_item_id, answer]));
  const items = [...detail.checklist_items].sort(
    (left, right) => left.display_order - right.display_order,
  );
  const result = detail.result;
  const pendingSubmission = detail.pending_submission;

  return (
    <div className="space-y-4">
      {!result && pendingSubmission ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Submission pending synchronization
              <Badge variant={resultVariants[pendingSubmission.overall_status]}>
                {overallStatusLabels[pendingSubmission.overall_status]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <span className="text-muted-foreground">Summary</span>
              <span className="whitespace-pre-wrap">
                {pendingSubmission.summary?.trim() || 'No summary supplied.'}
              </span>
            </div>
            <p className="text-muted-foreground">
              The authoritative submission number and time appear after synchronization.
            </p>
          </CardContent>
        </Card>
      ) : null}
      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Submission #{result.submission_number}
              <Badge variant={resultVariants[result.overall_status]}>
                {overallStatusLabels[result.overall_status]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-medium">{formatDateTime(result.submitted_at)}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
              <span className="text-muted-foreground">Summary</span>
              <span className="whitespace-pre-wrap">
                {result.summary?.trim() || 'No summary supplied.'}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            Checklist answers
            <Badge variant="outline">{detail.answers.length} saved</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">This checklist has no items.</p>
          ) : (
            items.map((item, index) => {
              const answer = answersByItem.get(item.id);
              return (
                <div key={item.id} className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">
                    {index + 1}. {item.question}
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Answer</dt>
                      <dd className="font-medium">
                        {answer ? formatAnswerValue(answer.answer_value) : 'No answer'}
                      </dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="whitespace-pre-wrap">
                        {answer?.notes?.trim() || 'No notes supplied.'}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
