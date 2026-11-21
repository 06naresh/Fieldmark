import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type { ListQuery, Site, SiteCreatePayload, SiteUpdatePayload } from '@/types/entities';

export const sitesApi = {
  async list(query: ListQuery = {}): Promise<ApiCollectionResponse<Site>> {
    const response = await apiClient.get<ApiCollectionResponse<Site>>('/sites', {
      params: query,
    });
    return response.data;
  },

  async create(payload: SiteCreatePayload): Promise<Site> {
    const response = await apiClient.post<ApiDataResponse<Site>>('/sites', payload);
    return response.data.data;
  },

  async update(id: string, payload: SiteUpdatePayload): Promise<Site> {
    const response = await apiClient.patch<ApiDataResponse<Site>>(`/sites/${id}`, payload);
    return response.data.data;
  },

  async setStatus(id: string, isActive: boolean, version: number): Promise<Site> {
    const response = await apiClient.patch<ApiDataResponse<Site>>(`/sites/${id}/status`, {
      is_active: isActive,
      version,
    });
    return response.data.data;
  },
};
