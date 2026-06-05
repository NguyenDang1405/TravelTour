import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  code: number;
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com',
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('ACCESS_TOKEN');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Cannot read token', e);
    }
    return config;
  },
  (error: any) => {
    return Promise.resolve({
      success: false,
      message: 'Network request setup failed.',
      code: -1,
    });
  }
);

// 2. Response Interceptor: Centralized error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return {
      success: true,
      data: response.data,
      message: 'Success',
      code: response.status,
    } as any;
  },
  async (error: AxiosError) => {
    let message = 'An unexpected error occurred. Please try again.';
    let code = error.response?.status || 500;

    if (error.response) {
      // Server responded with an error (4xx, 5xx)
      const errorData: any = error.response.data;
      message = errorData?.message || message;
      
      // Auto token refresh logic or logout for 401 can be placed here
      if (code === 401) {
        await SecureStore.deleteItemAsync('ACCESS_TOKEN');
      }
    } else if (error.request) {
      // Network error (no response received)
      message = 'Cannot connect to server. Please check your internet connection.';
      code = 0;
    }

    // RESOLVE instead of REJECT to prevent unhandled promise rejections (app crashes)
    return Promise.resolve({
      success: false,
      message,
      code,
    });
  }
);

export default apiClient;
