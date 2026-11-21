import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type {
  ChecklistItem,
  ChecklistTemplate,
  ChecklistTemplatePayload,
  ListQuery,
} from '@/types/entities';

export const checklistsApi = {
  async list(query: ListQuery = {}): Promise<ApiCollectionResponse<ChecklistTemplate>> {
    const response = await apiClient.get<ApiCollectionResponse<ChecklistTemplate>>(
      '/checklist-templates',
      { params: query },
    );
    return response.data;
  },

  async create(payload: ChecklistTemplatePayload): Promise<ChecklistTemplate> {
    const response = await apiClient.post<ApiDataResponse<ChecklistTemplate>>(
      '/checklist-templates',
      payload,
    );
    return response.data.data;
  },

  async createRevision(
    templateId: string,
    payload: ChecklistTemplatePayload,
  ): Promise<ChecklistTemplate> {
    const response = await apiClient.post<ApiDataResponse<ChecklistTemplate>>(
      `/checklist-templates/${templateId}/revisions`,
      payload,
    );
    return response.data.data;
  },

  async setStatus(id: string, isActive: boolean): Promise<ChecklistTemplate> {
    const response = await apiClient.patch<ApiDataResponse<ChecklistTemplate>>(
      `/checklist-templates/${id}/status`,
      { is_active: isActive },
    );
    return response.data.data;
  },

  async addItem(
    templateId: string,
    payload: ChecklistTemplatePayload['items'][number],
  ): Promise<ChecklistItem> {
    const response = await apiClient.post<ApiDataResponse<ChecklistItem>>(
      `/checklist-templates/${templateId}/items`,
      payload,
    );
    return response.data.data;
  },

  async updateItem(
    templateId: string,
    itemId: string,
    payload: Partial<ChecklistTemplatePayload['items'][number]>,
  ): Promise<ChecklistItem> {
    const response = await apiClient.patch<ApiDataResponse<ChecklistItem>>(
      `/checklist-templates/${templateId}/items/${itemId}`,
      payload,
    );
    return response.data.data;
  },
};
