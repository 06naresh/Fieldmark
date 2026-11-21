import type { CurrentUser } from '@/types/auth';
import type {
  ChecklistTemplate,
  DashboardSummary,
  Inspection,
  Site,
  User,
} from '@/types/entities';

export const adminUser: CurrentUser = {
  id: 'admin-1',
  full_name: 'Avery Admin',
  email: 'avery.admin@example.com',
  role: 'ADMIN',
  is_active: true,
};

export const inspectorCurrentUser: CurrentUser = {
  id: 'inspector-1',
  full_name: 'Iris Inspector',
  email: 'iris.inspector@example.com',
  role: 'INSPECTOR',
  is_active: true,
};

export const userFixture: User = {
  id: 'inspector-1',
  full_name: 'Iris Inspector',
  email: 'iris.inspector@example.com',
  role: 'INSPECTOR',
  is_active: true,
};

export const siteFixture: Site = {
  id: 'site-1',
  name: 'North Plant',
  site_code: 'NORTH-01',
  address: '1 Industrial Road',
  city: 'Springfield',
  state: 'IL',
  postal_code: '62701',
  country: 'USA',
  description: 'Primary inspection location.',
  is_active: true,
  version: 1,
};

export const templateFixture: ChecklistTemplate = {
  id: 'template-1',
  name: 'Safety checklist',
  description: 'General site safety review.',
  template_version: 2,
  is_active: true,
  version: 1,
  items: [
    {
      id: 'item-1',
      question: 'Are exits clear?',
      description: null,
      response_type: 'YES_NO',
      is_required: true,
      display_order: 1,
      options: null,
    },
  ],
};

export const inspectionFixture: Inspection = {
  id: 'inspection-1',
  site_id: siteFixture.id,
  template_id: templateFixture.id,
  template_version: templateFixture.template_version,
  assigned_to: userFixture.id,
  title: 'Quarterly safety review',
  instructions: 'Check all marked areas.',
  scheduled_at: '2026-12-01T09:00:00Z',
  due_at: '2026-12-01T17:00:00Z',
  status: 'ASSIGNED',
  version: 1,
};

export const summaryFixture: DashboardSummary = {
  total_inspections: 12,
  assigned_inspections: 4,
  in_progress_inspections: 3,
  submitted_inspections: 4,
  reviewed_inspections: 1,
  total_users: 8,
  active_inspectors: 6,
  total_sites: 5,
  pending_operations: 0,
  failed_operations: 0,
  open_conflicts: 0,
};

export const paginationFixture = {
  page: 1,
  page_size: 20,
  total: 1,
  total_pages: 1,
};
