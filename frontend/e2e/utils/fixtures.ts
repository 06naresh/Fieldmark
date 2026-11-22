import type { APIRequestContext } from '@playwright/test';
import {
  createInspectionApi,
  createInspectorApi,
  createSiteApi,
  createTemplateApi,
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_PASSWORD,
  getInspectionApi,
  loginApi,
  startInspectionApi,
  uniqueName,
  type ApiSession,
  type InspectionRecord,
  type SiteRecord,
  type TemplateRecord,
} from './api';

export interface InspectionFixture {
  admin: ApiSession;
  inspector: ApiSession;
  inspectorEmail: string;
  inspectorId: string;
  site: SiteRecord;
  template: TemplateRecord;
  inspection: InspectionRecord;
  question: string;
}

export async function createInspectionFixture(
  request: APIRequestContext,
  options: { question?: string; title?: string } = {},
): Promise<InspectionFixture> {
  const admin = await loginApi(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  const inspectorDetails = await createInspectorApi(request, admin.token);
  const inspector = await loginApi(request, inspectorDetails.email, E2E_PASSWORD);
  const site = await createSiteApi(request, admin.token);
  const question = options.question ?? 'Are safety guards in place?';
  const template = await createTemplateApi(request, admin.token, question);
  const inspection = await createInspectionApi(request, admin.token, {
    siteId: site.id,
    template,
    inspectorId: inspectorDetails.id,
    title: options.title ?? uniqueName('E2E Inspection'),
  });

  return {
    admin,
    inspector,
    inspectorEmail: inspectorDetails.email,
    inspectorId: inspectorDetails.id,
    site,
    template,
    inspection,
    question,
  };
}

export async function startFixtureInspection(
  request: APIRequestContext,
  fixture: InspectionFixture,
): Promise<InspectionRecord> {
  await startInspectionApi(
    request,
    fixture.inspector.token,
    fixture.inspection.id,
    fixture.inspection.version,
  );
  return getInspectionApi(request, fixture.inspector.token, fixture.inspection.id);
}
