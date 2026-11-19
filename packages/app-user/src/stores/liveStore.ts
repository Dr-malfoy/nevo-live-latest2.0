import { create } from 'zustand';

interface LivePlayerState {
  activeStreamId: string | null;
  isMinimized: boolean;
  isInPip: boolean;
  setActiveStreamId: (id: string | null) => void;
  setMinimized: (minimized: boolean) => void;
  setIsInPip: (inPip: boolean) => void;
  closeStream: () => void;
}

export const useLivePlayerStore = create<LivePlayerState>((set) => ({
  activeStreamId: null,
  isMinimized: false,
  isInPip: false,
  setActiveStreamId: (id) => set({ activeStreamId: id }),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  setIsInPip: (inPip) => set({ isInPip: inPip }),
  closeStream: () => set({ activeStreamId: null, isMinimized: false, isInPip: false }),
}));
