import { useUser } from '@clerk/clerk-expo';
import { create } from 'zustand';

type ClerkUser = ReturnType<typeof useUser>['user'];

interface AuthState {
  user: ClerkUser | null;
  isAuthenticated: boolean;
  setUser: (user: ClerkUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// updated
