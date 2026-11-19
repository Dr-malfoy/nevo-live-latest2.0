import { create } from 'zustand';

interface PartyPlayerState {
  activePartyId: string | null;
  isMinimized: boolean;
  partyName?: string;
  hostNickname?: string;
  hostAvatar?: string;

  setActivePartyId: (id: string | null) => void;
  setPartyInfo: (info: { partyName?: string; hostNickname?: string; hostAvatar?: string }) => void;
  setMinimized: (minimized: boolean) => void;
  closeParty: () => void;
}

export const usePartyPlayerStore = create<PartyPlayerState>((set) => ({
  activePartyId: null,
  isMinimized: false,
  partyName: undefined,
  hostNickname: undefined,
  hostAvatar: undefined,

  setActivePartyId: (id) => set({ activePartyId: id, isMinimized: false }),
  setPartyInfo: (info) => set((s) => ({ ...s, ...info })),
  setMinimized: (minimized) => set({ isMinimized: minimized }),
  closeParty: () =>
    set({
      activePartyId: null,
      isMinimized: false,
      partyName: undefined,
      hostNickname: undefined,
      hostAvatar: undefined,
    }),
}));
