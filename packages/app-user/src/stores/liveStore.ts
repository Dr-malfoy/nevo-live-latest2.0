import { create } from 'zustand';

interface LivePlayerState {
  activeStreamId: string | null;
  isMinimized: boolean;
  setActiveStreamId: (id: string | null) => void;
  setMinimized: (minimized: boolean) => void;
  closeStream: () => void;
}

export const useLivePlayerStore = create<LivePlayerState>((set) => ({
  activeStreamId: null,
  isMinimized: false,
  setActiveStreamId: (id) => set({ activeStreamId: id }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  closeStream: () => set({ activeStreamId: null, isMinimized: false }),
}));
