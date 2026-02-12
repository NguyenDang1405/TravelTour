import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService, UserPayload } from '../services/authService';

interface AuthState {
  user: UserPayload | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    
    // API failure won't throw exception due to apiClient design
    const response = await authService.login(email, password);
    
    if (response.success && response.data) {
      await SecureStore.setItemAsync('ACCESS_TOKEN', response.data.token);
      set({ user: response.data, isLoading: false });
      return true;
    } else {
      set({ error: response.message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('ACCESS_TOKEN');
    set({ user: null });
  },
}));
