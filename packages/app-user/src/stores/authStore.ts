import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, usersApi } from '../api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithOTP: (phone: string, code?: string, idToken?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (idToken?: string, accessToken?: string) => Promise<void>;
  register: (
    payloadOrPhone:
      | {
          fullName: string;
          username?: string;
          phone?: string;
          email?: string;
          nickname?: string;
          password?: string;
          confirmPassword?: string;
          dob?: string;
          birthday?: string;
          gender?: 'male' | 'female' | 'other' | 'unspecified';
          inviteCode?: string;
          inviter?: string;
          verificationToken?: string;
          idToken?: string;
          code?: string;
        }
      | string,
    nickname?: string,
    password?: string,
    verificationToken?: string,
    code?: string
  ) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.passwordLogin(phone, password);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Login failed',
          });
          throw err;
        }
      },

      loginWithOTP: async (phone, code, idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.verifyOtp(phone, code, idToken);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Verification failed',
          });
          throw err;
        }
      },

      loginWithGoogle: async (idToken) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.googleLogin(idToken);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Google login failed',
          });
          throw err;
        }
      },

      loginWithFacebook: async (idToken, accessToken) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.facebookLogin(idToken, accessToken);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Facebook login failed',
          });
          throw err;
        }
      },

      register: async (payloadOrPhone, nickname, password, verificationToken, code) => {
        set({ isLoading: true, error: null });
        try {
          const payload = typeof payloadOrPhone === 'string'
            ? { phone: payloadOrPhone, nickname, password, verificationToken, code }
            : payloadOrPhone;
          const { data } = await authApi.register(payload);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Registration failed',
          });
          throw err;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      fetchProfile: async () => {
        try {
          const { data } = await usersApi.getProfile();
          if (data.success && data.data) {
            set((state) => ({
              user: state.user ? { ...state.user, ...data.data } : data.data,
            }));
          }
        } catch {}
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
