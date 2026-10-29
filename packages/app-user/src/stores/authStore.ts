import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, usersApi } from '../api';
import type { User } from '../types';
import { pushNotificationService } from '../services/pushNotification';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  loginWithOTP: (phone: string, code?: string, idToken?: string) => Promise<void>;
  loginWithGoogle: (idToken: string, country?: string) => Promise<void>;
  loginWithFacebook: (idToken?: string, accessToken?: string, country?: string) => Promise<void>;
  register: (
    payloadOrPhone:
      | {
          fullName: string;
          username?: string;
          phone?: string;
          email?: string;
          country?: string;
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
          deviceId?: string;
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
            pushNotificationService.syncTokenWithBackend().catch(() => {});
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
            pushNotificationService.syncTokenWithBackend().catch(() => {});
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Verification failed',
          });
          throw err;
        }
      },

      loginWithGoogle: async (idToken, country) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.googleLogin(idToken, country);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            pushNotificationService.syncTokenWithBackend().catch(() => {});
          }
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.response?.data?.error || 'Google login failed',
          });
          throw err;
        }
      },

      loginWithFacebook: async (idToken, accessToken, country) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.facebookLogin(idToken, accessToken, country);
          if (data.success && data.data) {
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            pushNotificationService.syncTokenWithBackend().catch(() => {});
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
            pushNotificationService.syncTokenWithBackend().catch(() => {});
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
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          if (state.user.avatar && state.user.avatar.startsWith('blob:')) {
            state.user.avatar = undefined;
          }
          if (state.user.cover && state.user.cover.startsWith('blob:')) {
            state.user.cover = undefined;
          }
        }
      },
    }
  )
);
