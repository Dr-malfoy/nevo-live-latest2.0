// Persistent game settings (zustand + localStorage).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { audioEngine } from '../audio/engine';

interface SettingsState {
  sound: boolean;
  music: boolean;
  reduceMotion: boolean;
  volume: number;
  theme: 'dark' | 'light';
  autoSpin: boolean;
  setSound: (v: boolean) => void;
  setMusic: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setVolume: (v: number) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setAutoSpin: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      sound: true,
      music: true,
      reduceMotion: false,
      volume: 0.8,
      theme: 'dark',
      autoSpin: false,
      setSound: (v) => {
        set({ sound: v });
        audioEngine.setMuted(!v);
      },
      setMusic: (v) => set({ music: v }),
      setReduceMotion: (v) => set({ reduceMotion: v }),
      setVolume: (v) => {
        set({ volume: v });
        audioEngine.setVolume(v);
      },
      setTheme: (t) => set({ theme: t }),
      setAutoSpin: (v) => set({ autoSpin: v }),
    }),
    { name: 'roulette-settings' }
  )
);
