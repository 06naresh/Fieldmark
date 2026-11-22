import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';

export const API_BASE_URL =
  process.env.E2E_API_BASE_URL ?? 'http://localhost:8000/api/v1';
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin.e2e@fieldmark.test';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'FieldmarkE2E!23';
export const E2E_PASSWORD = 'InspectorE2E!23';

interface ApiEnvelope<T> {
  data: T;
}

interface ListEnvelope<T> extends ApiEnvelope<T[]> {
  pagination: Record<string, number>;
}

export interface ApiSession {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'INSPECTOR';
    full_name: string;
  };
}

export interface SiteRecord {
  id: string;
  name: string;
  site_code: string;
  version: number;
}

export interface ChecklistItemRecord {
  id: string;
  question: string;
  response_type: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  template_version: number;
  items: ChecklistItemRecord[];
}

export interface InspectionRecord {
  id: string;
  title: string;
  status: string;
  version: number;
  assigned_to: string;
}

export interface DeviceRecord {
  id: string;
  device_name: string | null;
}

export interface PushResultRecord {
  operation_id: string;
  status: string;
  entity_id: string;
  server_version: number | null;
  message: string | null;
}

export interface ConflictRecord {
  id: string;
  operation_id: string;
  entity_type: string;
  entity_id: string;
  server_version: number | null;
  status: string;
  resolution_type: string | null;
  resolved_by: string | null;
  local_payload?: Record<string, unknown>;
  server_payload?: Record<string, unknown>;
}

export interface SyncOperation {
  operation_id: string;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SUBMIT';
  entity_type: string;
  entity_id: string;
  base_version?: number;
  payload: Record<string, unknown>;
}

async function readJson(response: APIResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function apiRequest<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  options: { token?: string; data?: unknown; expectedStatus?: number } = {},
): Promise<T> {
  const response = await request.fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    data: options.data,
  });
  const expected = options.expectedStatus ?? 200;
  const body = await readJson(response);

  if (response.status() !== expected) {
    throw new Error(
      `API ${method} ${path} returned HTTP ${response.status()} (expected ${expected}): ${JSON.stringify(body)}`,
    );
  }

  return body as T;
}

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<ApiSession> {
  const body = await apiRequest<ApiEnvelope<Omit<ApiSession, 'token'> & { access_token: string }>>(
    request,
    'POST',
    '/auth/login',
    { data: { email, password } },
  );
  return {
    token: body.data.access_token,
    user: body.data.user,
  };
}

export async function createInspectorApi(
  request: APIRequestContext,
  adminToken: string,
  email = unique('inspector.e2e').concat('@fieldmark.test'),
): Promise<{ id: string; email: string; fullName: string }> {
  const fullName = `E2E Inspector ${Date.now().toString(36)}`;
  const body = await apiRequest<ApiEnvelope<{ id: string; email: string }>>(
    request,
    'POST',
    '/users',
    {
      token: adminToken,
      data: {
        full_name: fullName,
        email,
        password: E2E_PASSWORD,
        role: 'INSPECTOR',
      },
      expectedStatus: 201,
    },
  );
  return { id: body.data.id, email: body.data.email, fullName };
}

export async function createSiteApi(
  request: APIRequestContext,
  adminToken: string,
  name = unique('E2E Site'),
): Promise<SiteRecord> {
  const body = await apiRequest<ApiEnvelope<SiteRecord>>(request, 'POST', '/sites', {
    token: adminToken,
    data: {
      name,
      site_code: unique('E2E').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24),
      address: '1 Test Field Road',
      city: 'Test City',
      country: 'Testland',
    },
    expectedStatus: 201,
  });
  return body.data;
}

export async function createTemplateApi(
  request: APIRequestContext,
  adminToken: string,
  question = 'Are Safety guards in place?',
): Promise<TemplateRecord> {
  const body = await apiRequest<ApiEnvelope<TemplateRecord>>(
    request,
    'POST',
    '/checklist-templates',
    {
      token: adminToken,
      data: {
        name: unique('E2E Safety Checklist'),
        description: 'Deterministic Phase 13 checklist',
        items: [
          {
            question,
            description: null,
            response_type: 'YES_NO',
            is_required: true,
            display_order: 0,
            options: null,
          },
        ],
      },
      expectedStatus: 201,
    },
  );
  return body.data;
}

export async function createInspectionApi(
  request: APIRequestContext,
  adminToken: string,
  options: {
    siteId: string;
    template: TemplateRecord;
    inspectorId: string;
    title?: string;
  },
): Promise<InspectionRecord> {
  const body = await apiRequest<ApiEnvelope<InspectionRecord>>(
    request,
    'POST',
    '/inspections',
    {
      token: adminToken,
      data: {
        site_id: options.siteId,
        template_id: options.template.id,
        template_version: options.template.template_version,
        assigned_to: options.inspectorId,
        title: options.title ?? unique('E2E Inspection'),
      },
      expectedStatus: 201,
    },
  );
  return body.data;
}

export async function registerDeviceApi(
  request: APIRequestContext,
  token: string,
  name: string,
): Promise<DeviceRecord> {
  const body = await apiRequest<ApiEnvelope<DeviceRecord>>(
    request,
    'POST',
    '/devices',
    { token, data: { device_name: name }, expectedStatus: 201 },
  );
  return body.data;
}

export async function startInspectionApi(
  request: APIRequestContext,
  token: string,
  inspectionId: string,
  version: number,
): Promise<{ status: string; version: number }> {
  const body = await apiRequest<ApiEnvelope<{ status: string; version: number }>>(
    request,
    'POST',
    `/inspections/${inspectionId}/start`,
    { token, data: { version } },
  );
  return body.data;
}

export async function saveAnswerApi(
  request: APIRequestContext,
  token: string,
  inspectionId: string,
  itemId: string,
  value: unknown,
  baseVersion: number,
): Promise<{ id: string; version: number }> {
  const body = await apiRequest<ApiEnvelope<{ id: string; version: number }>>(
    request,
    'PUT',
    `/inspections/${inspectionId}/answers/${itemId}`,
    {
      token,
      data: { answer_value: value, notes: 'Saved by E2E', base_version: baseVersion },
    },
  );
  return body.data;
}

export async function getAnswersApi(
  request: APIRequestContext,
  token: string,
  inspectionId: string,
): Promise<Array<{ id: string; checklist_item_id: string; answer_value: unknown; version: number }>> {
  const body = await apiRequest<
    ApiEnvelope<Array<{ id: string; checklist_item_id: string; answer_value: unknown; version: number }>>
  >(
    request,
    'GET',
    `/inspections/${inspectionId}/answers`,
    { token },
  );
  return body.data;
}

export async function getInspectionApi(
  request: APIRequestContext,
  token: string,
  inspectionId: string,
): Promise<InspectionRecord> {
  const body = await apiRequest<ApiEnvelope<InspectionRecord>>(
    request,
    'GET',
    `/inspections/${inspectionId}`,
    { token },
  );
  return body.data;
}

export async function pushOperationsApi(
  request: APIRequestContext,
  token: string,
  deviceId: string,
  operations: SyncOperation[],
): Promise<PushResultRecord[]> {
  const body = await apiRequest<ApiEnvelope<{ results: PushResultRecord[] }>>(
    request,
    'POST',
    '/sync/push',
    { token, data: { device_id: deviceId, operations } },
  );
  return body.data.results;
}

export async function listConflictsApi(
  request: APIRequestContext,
  token: string,
  status = 'OPEN',
): Promise<ConflictRecord[]> {
  const body = await apiRequest<ListEnvelope<ConflictRecord>>(
    request,
    'GET',
    `/sync/conflicts?status=${status}&page=1&page_size=100`,
    { token },
  );
  return body.data;
}

export async function getConflictApi(
  request: APIRequestContext,
  token: string,
  conflictId: string,
): Promise<ConflictRecord> {
  const body = await apiRequest<ApiEnvelope<ConflictRecord>>(
    request,
    'GET',
    `/sync/conflicts/${conflictId}`,
    { token },
  );
  return body.data;
}

export async function resolveConflictApi(
  request: APIRequestContext,
  token: string,
  conflictId: string,
  expectedServerVersion: number,
): Promise<ConflictRecord> {
  const body = await apiRequest<ApiEnvelope<ConflictRecord>>(
    request,
    'POST',
    `/sync/conflicts/${conflictId}/resolve`,
    {
      token,
      data: {
        resolution_type: 'ADMIN_RESOLUTION',
        expected_server_version: expectedServerVersion,
      },
    },
  );
  return body.data;
}

export function answerOperation(options: {
  inspectionId: string;
  itemId: string;
  entityId?: string;
  operationId?: string;
  value: unknown;
  baseVersion?: number;
  notes?: string;
  operationType?: SyncOperation['operation_type'];
}): SyncOperation {
  const baseVersion = options.baseVersion ?? 1;
  return {
    operation_id: options.operationId ?? randomUUID(),
    operation_type: options.operationType ?? (baseVersion === 1 ? 'CREATE' : 'UPDATE'),
    entity_type: 'inspection_answer',
    entity_id: options.entityId ?? randomUUID(),
    base_version: baseVersion,
    payload: {
      inspection_id: options.inspectionId,
      checklist_item_id: options.itemId,
      answer_value: options.value,
      notes: options.notes ?? null,
    },
  };
}

export function randomId(): string {
  return randomUUID();
}

export function uniqueName(prefix: string): string {
  return unique(prefix);
}
