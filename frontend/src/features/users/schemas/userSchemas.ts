import { z } from 'zod';

export function createUserFormSchema(mode: 'create' | 'edit') {
  return z
    .object({
      full_name: z.string().trim().min(1, 'Full name is required.').max(150, 'Use 150 characters or fewer.'),
      email: z
        .string()
        .trim()
        .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address.'),
      password: z.string().optional(),
      role: z.enum(['ADMIN', 'INSPECTOR']),
    })
    .superRefine((values, context) => {
      if (mode === 'create' && (!values.password || values.password.length < 8)) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Password must be at least 8 characters.',
        });
      }
      if (values.password && values.password.length > 128) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Password must be 128 characters or fewer.',
        });
      }
    });
}

export type UserFormValues = z.input<ReturnType<typeof createUserFormSchema>>;
