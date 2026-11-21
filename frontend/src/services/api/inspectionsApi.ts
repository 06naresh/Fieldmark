import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type {
  Inspection,
  InspectionCreatePayload,
  InspectionUpdatePayload,
  ListQuery,
} from '@/types/entities';

export const inspectionsApi = {
  async list(query: ListQuery = {}): Promise<ApiCollectionResponse<Inspection>> {
    const response = await apiClient.get<ApiCollectionResponse<Inspection>>('/inspections', {
      params: query,
    });
    return response.data;
  },

  async create(payload: InspectionCreatePayload): Promise<Inspection> {
    const response = await apiClient.post<ApiDataResponse<Inspection>>('/inspections', payload);
    return response.data.data;
  },

  async update(id: string, payload: InspectionUpdatePayload): Promise<Inspection> {
    const response = await apiClient.patch<ApiDataResponse<Inspection>>(
      `/inspections/${id}`,
      payload,
    );
    return response.data.data;
  },
};
