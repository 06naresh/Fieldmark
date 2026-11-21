import { apiClient } from '@/lib/axios';
import type { ApiDataResponse } from '@/types/api';
import type { DashboardSummary } from '@/types/entities';

export const dashboardApi = {
  async summary(): Promise<DashboardSummary> {
    const response = await apiClient.get<ApiDataResponse<DashboardSummary>>('/dashboard/summary');
    return response.data.data;
  },
};
