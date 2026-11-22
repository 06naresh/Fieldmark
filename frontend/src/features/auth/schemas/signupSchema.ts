import { z } from 'zod';

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Full name is required.')
      .max(150, 'Full name must be 150 characters or fewer.'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required.')
      .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .max(128, 'Password must be 128 characters or fewer.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
