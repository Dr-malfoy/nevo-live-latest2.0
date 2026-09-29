import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Requirement #1 — the country filter is shared across Home / Live / Party /
 * Popular / Discover / Random, so it lives in one store rather than per-page
 * state. Persisted, so the choice survives a reload.
 *
 * An empty array means "All countries" — that is the default, and it is what
 * the API treats as no constraint.
 */
interface CountryState {
  selected: string[];
  isAll: () => boolean;
  /** Add or remove one country. */
  toggle: (code: string) => void;
  /** Replace the whole selection (used by the picker sheet). */
  setSelected: (codes: string[]) => void;
  /** Back to All 🌍. */
  clear: () => void;
}

export const useCountryStore = create<CountryState>()(
  persist(
    (set, get) => ({
      selected: [],

      isAll: () => get().selected.length === 0,

      toggle: (code) => {
        const upper = code.toUpperCase();
        const current = get().selected;
        set({
          selected: current.includes(upper)
            ? current.filter((c) => c !== upper)
            : [...current, upper],
        });
      },

      setSelected: (codes) => set({ selected: [...new Set(codes.map((c) => c.toUpperCase()))] }),

      clear: () => set({ selected: [] }),
    }),
    { name: 'country-filter' }
  )
);
