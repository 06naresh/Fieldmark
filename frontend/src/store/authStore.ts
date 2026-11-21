import { create } from 'zustand';
import type { CurrentUser } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: CurrentUser | null;
  status: AuthStatus;
  startLoading: () => void;
  setAuthenticated: (user: CurrentUser) => void;
  setUser: (user: CurrentUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  startLoading: () => set({ status: 'loading' }),
  setAuthenticated: (user) => set({ user, status: 'authenticated' }),
  setUser: (user) => set((state) => ({ user, status: state.user ? 'authenticated' : state.status })),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));
