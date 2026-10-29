import { create } from 'zustand';
import { streamsApi } from '../api';
import { useCountryStore } from './countryStore';
import type { LiveStream } from '../types';

export type StreamTab = 'popular' | 'follow' | 'newest' | 'explore' | 'foryou';

interface StreamState {
  streams: LiveStream[];
  currentStream: LiveStream | null;
  asChannel: string | null;
  asToken: string | null;
  isLoading: boolean;
  activeTab: StreamTab;
  fetchStreams: (tab?: string, type?: string) => Promise<void>;
  fetchFollowFeed: () => Promise<void>;
  setActiveTab: (tab: StreamTab) => void;
  joinStream: (id: string) => Promise<void>;
  leaveStream: (id: string) => Promise<void>;
  setCurrentStream: (stream: LiveStream | null) => void;
}

/**
 * Safety layer: one card per host — keep the latest valid live session.
 * Drops ended streams so the list only displays active live streams.
 */
const dedupeByHost = (streams: LiveStream[]): LiveStream[] => {
  const byHost = new Map<string, LiveStream>();
  for (const s of streams) {
    if (s.status !== 'live') continue;
    const hostObj = (s as any).host || (typeof s.hostId === 'object' ? s.hostId : null);
    const key = (hostObj as any)?._id || (hostObj as any)?.uid || (typeof s.hostId === 'string' ? s.hostId : s._id);
    if (!key) continue;
    const existing = byHost.get(key);
    if (!existing || new Date(s.startedAt) > new Date(existing.startedAt)) {
      byHost.set(key, s);
    }
  }
  return [...byHost.values()];
};

export const useStreamStore = create<StreamState>((set, get) => ({
  streams: [],
  currentStream: null,
  asChannel: null,
  asToken: null,
  isLoading: false,
  activeTab: 'popular',

  fetchStreams: async (tab, type) => {
    set({ isLoading: true });
    try {
      // Requirement #1 — every feed request carries the shared country filter.
      const countries = useCountryStore.getState().selected;
      const { data } = await streamsApi.getFeed({ tab: tab || get().activeTab, type, countries });
      if (data.success) {
        set({ streams: dedupeByHost(data.data || []), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchFollowFeed: async () => {
    set({ isLoading: true });
    try {
      const countries = useCountryStore.getState().selected;
      const { data } = await streamsApi.getFeed({ tab: 'follow', countries });
      if (data.success) {
        set({ streams: dedupeByHost(data.data || []), isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  joinStream: async (id) => {
    try {
      const { data } = await streamsApi.joinStream(id);
      if (data.success && data.data) {
        set({ asChannel: data.data.channel, asToken: data.data.token });
      }
    } catch {}
  },

  leaveStream: async (id) => {
    try {
      await streamsApi.leaveStream(id);
    } finally {
      set({ asChannel: null, asToken: null, currentStream: null });
    }
  },

  setCurrentStream: (stream) => set({ currentStream: stream }),
}));
