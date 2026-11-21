import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Minimal React Hook Form resolver for Zod object schemas.
 * Keeping this local avoids an extra dependency while satisfying the approved
 * React Hook Form + Zod validation approach.
 */
export function zodResolver<TFieldValues extends FieldValues>(
  schema: ZodType<TFieldValues, TFieldValues>,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'root';
      if (!errors[key]) {
        errors[key] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors: errors as FieldErrors<TFieldValues> };
  };
}
