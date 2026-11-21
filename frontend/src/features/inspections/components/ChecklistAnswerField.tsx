import { Controller, useFormContext } from 'react-hook-form';
import { Badge, Card, CardContent, CardHeader, CardTitle, Label, Textarea } from '@/components/ui';
import type { AnswerValue, ChecklistItem } from '@/types/entities';
import type { ExecutionFormValues } from '@/features/inspections/types/inspectionWorkflow';
import { getChecklistChoices } from '@/features/inspections/utils/inspectionAnswers';

interface ChecklistAnswerFieldProps {
  item: ChecklistItem;
  index: number;
  errorMessage?: string;
}

const inputClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function ChecklistAnswerField({
  item,
  index,
  errorMessage,
}: ChecklistAnswerFieldProps): React.JSX.Element {
  const { control } = useFormContext<ExecutionFormValues>();
  const choices = getChecklistChoices(item);
  const answerName = `answers.${item.id}` as const;
  const notesName = `notes.${item.id}` as const;
  const errorId = `${item.id}-error`;

  return (
    <Card className={errorMessage ? 'border-destructive' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {index + 1}. {item.question}
            {item.is_required ? <span className="ml-1 text-destructive">*</span> : null}
          </CardTitle>
          <Badge variant="outline">{item.response_type.replace(/_/g, ' ')}</Badge>
        </div>
        {item.description ? (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <Controller
          control={control}
          name={answerName}
          render={({ field }) => {
            if (item.response_type === 'YES_NO') {
              return (
                <fieldset
                  className="space-y-2"
                  aria-label={item.question}
                  aria-invalid={Boolean(errorMessage)}
                >
                  <legend className="text-sm font-medium">Answer</legend>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'Yes', value: 'true' },
                      { label: 'No', value: 'false' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={field.name}
                          value={option.value}
                          checked={field.value === (option.value === 'true')}
                          onChange={() => field.onChange(option.value === 'true')}
                          className="h-4 w-4"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }

            if (item.response_type === 'NUMBER') {
              return (
                <div className="space-y-2">
                  <Label htmlFor={item.id}>Answer</Label>
                  <input
                    id={item.id}
                    type="number"
                    aria-label={item.question}
                    className={inputClassName}
                    value={typeof field.value === 'number' ? String(field.value) : ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === '') {
                        field.onChange(null);
                        return;
                      }
                      const parsed = Number(raw);
                      field.onChange(Number.isFinite(parsed) ? parsed : null);
                    }}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? errorId : undefined}
                  />
                </div>
              );
            }

            if (item.response_type === 'TEXT') {
              return (
                <div className="space-y-2">
                  <Label htmlFor={item.id}>Answer</Label>
                  <input
                    id={item.id}
                    type="text"
                    aria-label={item.question}
                    className={inputClassName}
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? errorId : undefined}
                  />
                </div>
              );
            }

            if (item.response_type === 'SINGLE_CHOICE') {
              return (
                <div className="space-y-2">
                  <Label htmlFor={item.id}>Answer</Label>
                  <select
                    id={item.id}
                    aria-label={item.question}
                    className={inputClassName}
                    value={typeof field.value === 'string' ? field.value : ''}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    onBlur={field.onBlur}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? errorId : undefined}
                  >
                    <option value="">Select an option</option>
                    {choices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            const selected = Array.isArray(field.value) ? field.value : [];
            return (
              <fieldset
                className="space-y-2"
                aria-label={item.question}
                aria-invalid={Boolean(errorMessage)}
              >
                <legend className="text-sm font-medium">Answer</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {choices.map((choice) => (
                    <label key={choice} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={field.name}
                        value={choice}
                        checked={selected.includes(choice)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...selected, choice]
                            : selected.filter((value) => value !== choice);
                          field.onChange(next as AnswerValue);
                        }}
                        className="h-4 w-4"
                      />
                      {choice}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }}
        />

        {errorMessage ? (
          <p id={errorId} className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Controller
          control={control}
          name={notesName}
          render={({ field }) => (
            <div className="space-y-2">
              <Label htmlFor={`${item.id}-notes`}>Notes</Label>
              <Textarea
                id={`${item.id}-notes`}
                rows={2}
                placeholder="Optional observations for this item"
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
              />
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
