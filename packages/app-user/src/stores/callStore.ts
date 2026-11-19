import { create } from 'zustand';

export interface CallIncomingPayload {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  initiatorId: string;
  token: string;
  initiator: { nickname: string; avatar?: string } | null;
  coinsPerMinute?: number;
  isFreeMinuteApplied?: boolean;
}

export interface CallOutgoingPayload {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  token: string;
  callee?: { nickname: string; avatar?: string; online?: boolean } | null;
  coinsPerMinute?: number;
  isFreeMinuteApplied?: boolean;
}

export interface ActiveCallData {
  incoming?: CallIncomingPayload;
  outgoing?: CallOutgoingPayload;
  accepted?: boolean;
  coinsPerMinute?: number;
  isAudience?: boolean;
  isFreeMinuteApplied?: boolean;
}

interface CallStoreState {
  activeCall: ActiveCallData | null;
  callAccepted: boolean;
  isMinimized: boolean;
  isBannerMode: boolean;
  isOnHold: boolean;

  setActiveCall: (call: ActiveCallData | null) => void;
  setCallAccepted: (accepted: boolean) => void;
  setMinimized: (minimized: boolean) => void;
  setBannerMode: (banner: boolean) => void;
  setIsOnHold: (onHold: boolean) => void;
  endActiveCall: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  activeCall: null,
  callAccepted: false,
  isMinimized: false,
  isBannerMode: false,
  isOnHold: false,

  setActiveCall: (call) =>
    set({
      activeCall: call,
      callAccepted: Boolean(call?.accepted),
      isMinimized: false,
      isBannerMode: false,
      isOnHold: false,
    }),

  setCallAccepted: (accepted) => set({ callAccepted: accepted }),

  setMinimized: (minimized) =>
    set((state) => ({
      isMinimized: minimized,
      isBannerMode: minimized ? state.isBannerMode : false,
    })),

  setBannerMode: (banner) =>
    set((state) => ({
      isBannerMode: banner,
      isMinimized: banner ? true : state.isMinimized,
    })),

  setIsOnHold: (onHold) => set({ isOnHold: onHold }),

  endActiveCall: () =>
    set({
      activeCall: null,
      callAccepted: false,
      isMinimized: false,
      isBannerMode: false,
      isOnHold: false,
    }),
}));
