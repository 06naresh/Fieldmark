import { OfflinePersistenceError } from '@/db/localTypes';
import {
  getLocalInspectionDetail,
  getLocalInspectionRecord,
  getLocalSyncSummary,
  listLocalInspections,
  listLocalSites,
  listLocalTemplates,
  saveDownloadedInspectionDetail,
  saveDownloadedInspectionSummaries,
  type LocalSyncSummary,
} from '@/db/localRepositories';
import type { ApiCollectionResponse } from '@/types/api';
import type { ChecklistTemplate, Inspection, InspectionDetail, Site } from '@/types/entities';

/** navigator.onLine is the fast signal; backend reachability is refined later. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** Fetch an inspection detail and cache every offline dependency atomically. */
export async function cacheInspectionForOffline(
  ownerId: string,
  detail: InspectionDetail,
): Promise<void> {
  await saveDownloadedInspectionDetail(ownerId, detail);
}

/**
 * Return an inspection detail from the local cache when offline. While online,
 * fetch from the server without implicitly downloading it; offline copies are
 * created only by an explicit download action.
 */
export async function getInspectionDetail(
  ownerId: string,
  inspectionId: string,
  fetchDetail: () => Promise<InspectionDetail>,
): Promise<InspectionDetail> {
  if (isOffline()) {
    const cached = await getLocalInspectionDetail(ownerId, inspectionId);
    if (cached) {
      return cached;
    }
    throw new OfflinePersistenceError(
      'This inspection was not downloaded for offline use.',
      'OFFLINE_INSPECTION_MISSING',
    );
  }

  return fetchDetail();
}

/** Return assigned inspections, falling back to downloaded summaries offline. */
export async function getAssignedInspections(
  ownerId: string,
  fetchInspections: () => Promise<ApiCollectionResponse<Inspection>>,
): Promise<ApiCollectionResponse<Inspection>> {
  if (isOffline()) {
    return { data: await listLocalInspections(ownerId) };
  }

  try {
    const result = await fetchInspections();
    await saveDownloadedInspectionSummaries(ownerId, result.data).catch(() => undefined);
    return result;
  } catch (error) {
    const cached = await listLocalInspections(ownerId).catch(() => []);
    if (cached.length > 0) {
      return { data: cached };
    }
    throw error;
  }
}

/** Reference labels come from the local cache when the device is offline. */
export async function getInspectionReferences(
  ownerId: string,
  fetchSites: () => Promise<ApiCollectionResponse<Site>>,
  fetchTemplates: () => Promise<ApiCollectionResponse<ChecklistTemplate>>,
): Promise<{ sites: Site[]; templates: ChecklistTemplate[] }> {
  if (isOffline()) {
    return { sites: await listLocalSites(ownerId), templates: await listLocalTemplates(ownerId) };
  }

  const [sites, templates] = await Promise.all([fetchSites(), fetchTemplates()]);
  return { sites: sites.data, templates: templates.data };
}

export async function isInspectionAvailableOffline(
  ownerId: string,
  inspectionId: string,
): Promise<boolean> {
  const record = await getLocalInspectionRecord(ownerId, inspectionId);
  return Boolean(record?.detail);
}

export async function getSyncSummary(ownerId: string): Promise<LocalSyncSummary> {
  return getLocalSyncSummary(ownerId);
}
