import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type {
  AnswerSavePayload,
  Inspection,
  InspectionAnswer,
  InspectionCreatePayload,
  InspectionDetail,
  InspectionStartResult,
  InspectionSubmitPayload,
  InspectionSubmitResult,
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

  async detail(id: string): Promise<InspectionDetail> {
    const response = await apiClient.get<ApiDataResponse<InspectionDetail>>(`/inspections/${id}`);
    return response.data.data;
  },

  async start(id: string, version: number): Promise<InspectionStartResult> {
    const response = await apiClient.post<ApiDataResponse<InspectionStartResult>>(
      `/inspections/${id}/start`,
      { version },
    );
    return response.data.data;
  },

  async saveAnswer(
    inspectionId: string,
    checklistItemId: string,
    payload: AnswerSavePayload,
  ): Promise<InspectionAnswer> {
    const response = await apiClient.put<ApiDataResponse<InspectionAnswer>>(
      `/inspections/${inspectionId}/answers/${checklistItemId}`,
      payload,
    );
    return response.data.data;
  },

  async submit(
    inspectionId: string,
    payload: InspectionSubmitPayload,
  ): Promise<InspectionSubmitResult> {
    const response = await apiClient.post<ApiDataResponse<InspectionSubmitResult>>(
      `/inspections/${inspectionId}/submit`,
      payload,
    );
    return response.data.data;
  },
};
