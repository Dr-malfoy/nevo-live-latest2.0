import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminApi } from '../api';

interface AdminAuthState {
  user: any | null;
  token: string | null;
  isAuth: boolean;
  loading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null, token: null, isAuth: false, loading: false, error: null,
      login: async (phone, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await adminApi.login(phone, password);
          if (data.success && data.data?.user?.isAdmin) {
            set({ user: data.data.user, token: data.data.token, isAuth: true, loading: false });
          } else {
            set({ error: 'Admin access required', loading: false });
          }
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Login failed', loading: false });
        }
      },
      loginWithGoogle: async (idToken) => {
        set({ loading: true, error: null });
        try {
          const { data } = await adminApi.googleLogin(idToken);
          if (data.success && data.data?.user?.isAdmin) {
            set({ user: data.data.user, token: data.data.token, isAuth: true, loading: false });
          } else {
            set({ error: 'Admin access required', loading: false });
          }
        } catch (err: any) {
          set({ error: err.response?.data?.error || 'Google login failed', loading: false });
        }
      },
      logout: () => set({ user: null, token: null, isAuth: false, error: null }),
    }),
    { name: 'admin-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuth: s.isAuth }) }
  )
);
