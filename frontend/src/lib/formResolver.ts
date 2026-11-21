import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

/**
 * Minimal React Hook Form resolver for Zod object schemas.
 * Keeping this local avoids an extra dependency while satisfying the approved
 * React Hook Form + Zod validation approach.
 */
export function zodResolver<TFieldValues extends FieldValues>(
  schema: ZodTypeAny,
): Resolver<TFieldValues> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data as TFieldValues, errors: {} };
    }

    const errors: Record<string, unknown> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String);
      const leaf = path.length > 0 ? path[path.length - 1] : 'root';
      let cursor = errors;

      for (const segment of path.slice(0, -1)) {
        const existing = cursor[segment];
        if (!existing || typeof existing !== 'object') {
          cursor[segment] = {};
        }
        cursor = cursor[segment] as Record<string, unknown>;
      }

      if (!cursor[leaf]) {
        cursor[leaf] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors: errors as FieldErrors<TFieldValues> };
  };
}
