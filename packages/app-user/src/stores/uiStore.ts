import { create } from 'zustand';

interface UIState {
  activeModal: string | null;
  activeBottomSheet: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  openModal: (name: string) => void;
  closeModal: () => void;
  openSheet: (name: string) => void;
  closeSheet: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  activeBottomSheet: null,
  toast: null,

  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
  openSheet: (name) => set({ activeBottomSheet: name }),
  closeSheet: () => set({ activeBottomSheet: null }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  hideToast: () => set({ toast: null }),
}));
