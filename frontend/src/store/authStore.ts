import { create } from 'zustand';
import { User, AuthTokens, UserRole, UserStatus } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('syllabiq_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  accessToken: localStorage.getItem('syllabiq_access_token'),
  refreshToken: localStorage.getItem('syllabiq_refresh_token'),
  isAuthenticated: !!localStorage.getItem('syllabiq_access_token'),
  isLoading: false,

  setAuth: (user, tokens) => {
    localStorage.setItem('syllabiq_user', JSON.stringify(user));
    if (tokens?.accessToken) {
      localStorage.setItem('syllabiq_access_token', tokens.accessToken);
    }
    if (tokens?.refreshToken) {
      localStorage.setItem('syllabiq_refresh_token', tokens.refreshToken);
    }
    set({
      user,
      accessToken: tokens?.accessToken || null,
      refreshToken: tokens?.refreshToken || null,
      isAuthenticated: true,
    });
  },

  setUser: (user) => {
    localStorage.setItem('syllabiq_user', JSON.stringify(user));
    set({ user });
  },

  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...partialUser };
      localStorage.setItem('syllabiq_user', JSON.stringify(updated));
      return { user: updated };
    });
  },

  logout: () => {
    localStorage.removeItem('syllabiq_user');
    localStorage.removeItem('syllabiq_access_token');
    localStorage.removeItem('syllabiq_refresh_token');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
