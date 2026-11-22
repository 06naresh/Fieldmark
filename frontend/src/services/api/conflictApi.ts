import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type {
  ConflictDetail,
  ConflictResolveRequest,
  ConflictResolveResponse,
  ConflictStatus,
  ConflictSummary,
} from '@/services/sync/syncTypes';

export interface ListConflictsParams {
  page?: number;
  pageSize?: number;
  status?: ConflictStatus;
}

export const conflictApi = {
  async list(params: ListConflictsParams = {}): Promise<ApiCollectionResponse<ConflictSummary>> {
    const response = await apiClient.get<ApiCollectionResponse<ConflictSummary>>('/sync/conflicts', {
      params: {
        page: params.page,
        page_size: params.pageSize,
        status: params.status,
      },
    });
    return response.data;
  },

  async detail(conflictId: string): Promise<ConflictDetail> {
    const response = await apiClient.get<ApiDataResponse<ConflictDetail>>(
      `/sync/conflicts/${conflictId}`,
    );
    return response.data.data;
  },

  async resolve(
    conflictId: string,
    payload: ConflictResolveRequest,
  ): Promise<ConflictResolveResponse> {
    const response = await apiClient.post<ApiDataResponse<ConflictResolveResponse>>(
      `/sync/conflicts/${conflictId}/resolve`,
      payload,
    );
    return response.data.data;
  },
};
