import { useCallback, useState } from 'react';

export interface VideoFilter {
  id: string;
  label: string;
  /** CSS filter string applied to the local preview element. */
  css: string;
}

export const FILTERS: VideoFilter[] = [
  { id: 'natural', label: 'Natural', css: 'none' },
  { id: 'warm', label: 'Warm', css: 'sepia(0.25) saturate(1.15) brightness(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.1) hue-rotate(-8deg) brightness(1.02)' },
  { id: 'bright', label: 'Bright', css: 'brightness(1.18) saturate(1.1) contrast(1.02)' },
  { id: 'soft-glow', label: 'Soft Glow', css: 'brightness(1.08) contrast(0.96) saturate(1.2) blur(0.3px)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.5) saturate(0.9) contrast(0.95) brightness(0.98)' },
  { id: 'cinematic', label: 'Cinematic', css: 'contrast(1.15) saturate(1.05) brightness(0.95) sepia(0.12)' },
  { id: 'dreamy', label: 'Dreamy', css: 'saturate(1.35) brightness(1.1) contrast(0.92) blur(0.4px) hue-rotate(12deg)' },
];

/**
 * CSS-based video filters applied to the local preview only.
 * Zero RTC impact — the published stream is untouched (viewers see the
 * original feed; true stream-side filtering requires Agora extension licensing).
 */
export const useVideoFilters = () => {
  const [activeFilter, setActiveFilter] = useState<VideoFilter>(FILTERS[0]);

  const applyFilter = useCallback((id: string) => {
    const f = FILTERS.find((x) => x.id === id) || FILTERS[0];
    setActiveFilter(f);
  }, []);

  const clearFilter = useCallback(() => setActiveFilter(FILTERS[0]), []);

  return { activeFilter, applyFilter, clearFilter };
};
