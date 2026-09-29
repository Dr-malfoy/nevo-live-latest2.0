import { create } from 'zustand';
import { streamsApi } from '../api';
import { useCountryStore } from './countryStore';
import type { LiveStream } from '../types';

interface StreamState {
  streams: LiveStream[];
  currentStream: LiveStream | null;
  asChannel: string | null;
  asToken: string | null;
  isLoading: boolean;
  activeTab: 'popular' | 'follow' | 'newest';
  fetchStreams: (tab?: string, type?: string) => Promise<void>;
  fetchFollowFeed: () => Promise<void>;
  setActiveTab: (tab: 'popular' | 'follow' | 'newest') => void;
  joinStream: (id: string) => Promise<void>;
  leaveStream: (id: string) => Promise<void>;
  setCurrentStream: (stream: LiveStream | null) => void;
}

/** Stale-heartbeat window (matches the backend reaper). */
const HEARTBEAT_STALE_MS = 60_000;

/**
 * Safety layer: one card per host — keep the latest valid live session.
 * Also drops ended and stale-heartbeat streams so the list never shows
 * streams whose host has gone silent.
 */
const dedupeByHost = (streams: LiveStream[]): LiveStream[] => {
  const byHost = new Map<string, LiveStream>();
  const staleBefore = Date.now() - HEARTBEAT_STALE_MS;
  for (const s of streams) {
    if (s.status !== 'live') continue;
    if (s.hostId === null || typeof s.hostId === 'string') continue; // orphaned — skip
    // Skip streams whose host hasn't heartbeated recently (offline).
    if (s.heartbeatAt && new Date(s.heartbeatAt).getTime() < staleBefore) continue;
    const key = (s.hostId as any)._id || (s.hostId as any).uid;
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
