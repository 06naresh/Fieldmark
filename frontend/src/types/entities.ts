import type { UserRole } from '@/types/auth';

export type InspectionStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'CANCELLED';

export type ResponseType =
  | 'YES_NO'
  | 'TEXT'
  | 'NUMBER'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE';

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface UserCreatePayload {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UserUpdatePayload {
  full_name: string;
  role: UserRole;
}

export interface Site {
  id: string;
  name: string;
  site_code: string;
  address: string;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  description: string | null;
  is_active: boolean;
  version: number;
}

export interface SiteCreatePayload {
  name: string;
  site_code: string;
  address: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  description?: string | null;
}

export interface SiteUpdatePayload extends Partial<Omit<SiteCreatePayload, 'site_code'>> {
  version: number;
}

export interface ChecklistItem {
  id: string;
  question: string;
  description: string | null;
  response_type: ResponseType;
  is_required: boolean;
  display_order: number;
  options: Record<string, unknown> | null;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  template_version: number;
  is_active: boolean;
  version: number;
  items: ChecklistItem[];
}

export interface ChecklistTemplatePayload {
  name: string;
  description?: string | null;
  items: Array<{
    question: string;
    description?: string | null;
    response_type: ResponseType;
    is_required: boolean;
    display_order: number;
    options?: Record<string, unknown> | null;
  }>;
}

export interface Inspection {
  id: string;
  site_id: string;
  template_id: string;
  template_version: number;
  assigned_to: string;
  title: string;
  instructions: string | null;
  scheduled_at: string | null;
  due_at: string | null;
  status: InspectionStatus;
  version: number;
}

export interface InspectionCreatePayload {
  site_id: string;
  template_id: string;
  template_version: number;
  assigned_to: string;
  title: string;
  instructions?: string | null;
  scheduled_at?: string | null;
  due_at?: string | null;
}

export interface InspectionUpdatePayload {
  title: string;
  instructions?: string | null;
  scheduled_at?: string | null;
  due_at?: string | null;
  version: number;
}

export type AnswerValue = string | number | boolean | string[] | null;
export type OverallStatus = 'PASS' | 'FAIL' | 'NEEDS_REVIEW';

export interface InspectionAnswer {
  id: string;
  inspection_id: string;
  checklist_item_id: string;
  answer_value: AnswerValue;
  notes: string | null;
  version: number;
}

export interface InspectionDetail extends Inspection {
  site: Site;
  template: ChecklistTemplate;
  checklist_items: ChecklistItem[];
  answers: InspectionAnswer[];
}

export interface AnswerSavePayload {
  answer_value: AnswerValue;
  notes?: string | null;
  base_version: number;
}

export interface InspectionStartResult {
  id: string;
  status: InspectionStatus;
  version: number;
}

export interface InspectionSubmitPayload {
  summary?: string | null;
  overall_status: OverallStatus;
  version: number;
  submission_id: string;
}

export interface InspectionSubmitResult {
  result_id: string;
  inspection_id: string;
  submission_number: number;
  overall_status: OverallStatus;
  submitted_at: string;
  inspection_status: InspectionStatus;
}

export interface DashboardSummary {
  total_inspections: number;
  assigned_inspections: number;
  in_progress_inspections: number;
  submitted_inspections: number;
  reviewed_inspections: number;
  total_users: number | null;
  active_inspectors: number | null;
  total_sites: number | null;
  pending_operations: number;
  failed_operations: number;
  open_conflicts: number;
}

export interface ListQuery {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  is_active?: boolean;
  site_id?: string;
}
