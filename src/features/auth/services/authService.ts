import apiClient, { ApiResponse } from '../../../shared/api/apiClient';

export interface UserPayload {
  id: string;
  name: string;
  email: string;
  token: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<ApiResponse<UserPayload>> => {
    // Safely wrapped by interceptor
    const response = await apiClient.post('/auth/login', { email, password });
    return response as unknown as ApiResponse<UserPayload>;
  },
  
  logout: async (): Promise<ApiResponse> => {
    const response = await apiClient.post('/auth/logout');
    return response as unknown as ApiResponse;
  }
};
