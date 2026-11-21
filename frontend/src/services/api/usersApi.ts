import { apiClient } from '@/lib/axios';
import type { ApiCollectionResponse, ApiDataResponse } from '@/types/api';
import type { ListQuery, User, UserCreatePayload, UserUpdatePayload } from '@/types/entities';

export const usersApi = {
  async list(query: ListQuery = {}): Promise<ApiCollectionResponse<User>> {
    const response = await apiClient.get<ApiCollectionResponse<User>>('/users', {
      params: query,
    });
    return response.data;
  },

  async create(payload: UserCreatePayload): Promise<User> {
    const response = await apiClient.post<ApiDataResponse<User>>('/users', payload);
    return response.data.data;
  },

  async update(id: string, payload: UserUpdatePayload): Promise<User> {
    const response = await apiClient.patch<ApiDataResponse<User>>(`/users/${id}`, payload);
    return response.data.data;
  },

  async setStatus(id: string, isActive: boolean): Promise<User> {
    const response = await apiClient.patch<ApiDataResponse<User>>(`/users/${id}/status`, {
      is_active: isActive,
    });
    return response.data.data;
  },
};
