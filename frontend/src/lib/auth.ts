import { ROUTES } from '@/lib/constants';
import type { UserRole } from '@/types/auth';

export function dashboardForRole(role: UserRole): string {
  return role === 'ADMIN' ? ROUTES.admin.dashboard : ROUTES.inspector.dashboard;
}
