import { apiClient } from '@/lib/axios';
import type { ApiDataResponse, ActionResponse } from '@/types/api';
import type {
  CurrentUser,
  AuthUser,
  LoginCredentials,
  LoginResponse,
  SignupCredentials,
  TokenResponse,
} from '@/types/auth';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<ApiDataResponse<LoginResponse>>(
      '/auth/login',
      credentials,
    );
    return response.data.data;
  },

  async signup(credentials: SignupCredentials): Promise<AuthUser> {
    const response = await apiClient.post<ApiDataResponse<AuthUser>>(
      '/auth/signup',
      credentials,
    );
    return response.data.data;
  },

  async refresh(): Promise<TokenResponse> {
    const response = await apiClient.post<ApiDataResponse<TokenResponse>>('/auth/refresh');
    return response.data.data;
  },

  async me(): Promise<CurrentUser> {
    const response = await apiClient.get<ApiDataResponse<CurrentUser>>('/auth/me');
    return response.data.data;
  },

  async logout(logoutAllDevices = false): Promise<string> {
    const response = await apiClient.post<ActionResponse>('/auth/logout', {
      logout_all_devices: logoutAllDevices,
    });
    return response.data.message;
  },
};
