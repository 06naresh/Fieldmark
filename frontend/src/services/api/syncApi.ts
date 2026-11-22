import { apiClient } from '@/lib/axios';
import type { ApiDataResponse } from '@/types/api';
import type {
  DeviceCreatePayload,
  DeviceResponse,
  PushResult,
  SyncOperationRequest,
  SyncPullResponse,
  SyncStatusResponse,
} from '@/services/sync/syncTypes';

export const syncApi = {
  async registerDevice(payload: DeviceCreatePayload): Promise<DeviceResponse> {
    const response = await apiClient.post<ApiDataResponse<DeviceResponse>>('/devices', payload);
    return response.data.data;
  },

  async push(
    deviceId: string,
    operations: SyncOperationRequest[],
  ): Promise<{ results: PushResult[] }> {
    const response = await apiClient.post<ApiDataResponse<{ results: PushResult[] }>>(
      '/sync/push',
      { device_id: deviceId, operations },
    );
    return response.data.data;
  },

  async pull(
    deviceId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<SyncPullResponse> {
    const response = await apiClient.get<ApiDataResponse<SyncPullResponse>>('/sync/pull', {
      params: { device_id: deviceId, cursor: cursor ?? undefined, limit },
    });
    return response.data.data;
  },

  async status(deviceId: string): Promise<SyncStatusResponse> {
    const response = await apiClient.get<ApiDataResponse<SyncStatusResponse>>('/sync/status', {
      params: { device_id: deviceId },
    });
    return response.data.data;
  },
};
