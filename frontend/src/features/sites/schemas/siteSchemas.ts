import { z } from 'zod';

export const siteFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200, 'Use 200 characters or fewer.'),
  site_code: z
    .string()
    .trim()
    .min(1, 'Site code is required.')
    .max(50, 'Use 50 characters or fewer.')
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, hyphens, or underscores only.'),
  address: z.string().trim().min(1, 'Address is required.'),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().optional(),
  description: z.string().trim().optional(),
  version: z.number().int().min(1, 'Version is required.'),
});

export type SiteFormValues = z.infer<typeof siteFormSchema>;
