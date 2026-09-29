import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { coinApi } from '../api';

export const useCoinAuth = create<any>()(persist(
  (set) => ({
    user: null, token: null, isAuth: false,
    login: async (p: string, pw: string) => {
      const { data } = await coinApi.login(p, pw);
      if (data.success && data.data?.user?.role === 'agent') {
        set({ user: data.data.user, token: data.data.token, isAuth: true });
      } else {
        throw new Error('Agent access required');
      }
    },
    setUser: (u: any) => set({ user: u }),
    logout: () => set({ user: null, token: null, isAuth: false }),
  }),
  { name: 'coin-auth', partialize: (s: any) => ({ user: s.user, token: s.token, isAuth: s.isAuth }) }
));
