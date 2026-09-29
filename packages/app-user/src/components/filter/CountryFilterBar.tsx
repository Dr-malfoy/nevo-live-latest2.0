import { useEffect, useMemo, useState } from 'react';
import { PiSlidersHorizontalFill as SlidersHorizontal } from 'react-icons/pi';
import { useQuery } from '@tanstack/react-query';
import { streamsApi } from '../../api';
import { useCountryStore } from '../../stores';
import { ALL_COUNTRIES, PRIORITY_COUNTRIES, countryName, flagEmoji, sortForFilterBar } from '../../lib/countries';
import { CountryPickerSheet } from './CountryPickerSheet';

interface CountryFilterBarProps {
  /** Extra classes for page-specific spacing. */
  className?: string;
  /** `overlay` inverts the colours for use on top of a dark/media header. */
  variant?: 'default' | 'overlay';
}

/**
 * Requirement #1 — the country filter bar.
 *
 * `[All 🌍] [Bangladesh 🇧🇩] [India 🇮🇳] [Pakistan 🇵🇰] … [filter]`
 *
 * Chips come from the countries that actually have live hosts right now, so
 * the bar never offers a filter that returns an empty feed. Selection lives in
 * the shared store, so switching tabs keeps the filter.
 */
export const CountryFilterBar = ({ className = '', variant = 'default' }: CountryFilterBarProps) => {
  const { selected, toggle, setSelected, clear } = useCountryStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['stream-countries'],
    queryFn: async () => {
      const { data } = await streamsApi.getCountries();
      return data.data || [];
    },
    staleTime: 60_000,
  });

  const liveCodes = useMemo(() => (data || []).map((c) => c.code), [data]);

  /**
   * Chips shown inline: the live countries, plus the app's core markets as a
   * fallback while the feed is empty, plus anything already selected (so a
   * selected country never disappears off the bar when its host goes offline).
   */
  const chips = useMemo(() => {
    const base = liveCodes.length > 0 ? liveCodes : PRIORITY_COUNTRIES;
    return sortForFilterBar([...base, ...selected]);
  }, [liveCodes, selected]);

  // If every selected country has gone offline the feed reads as empty with no
  // explanation, so fall back to All rather than showing a dead filter.
  useEffect(() => {
    if (selected.length === 0 || liveCodes.length === 0) return;
    const anyLive = selected.some((code) => liveCodes.includes(code));
    if (!anyLive) clear();
  }, [liveCodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOverlay = variant === 'overlay';
  const isAll = selected.length === 0;

  const chipClass = (active: boolean) =>
    active
      ? 'bg-[#564bf2] text-white'
      : 'bg-white shadow-sm border border-black/5 text-ink-soft';

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={clear}
            className={`shrink-0 h-8 px-3 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${chipClass(
              isAll
            )}`}
          >
            Popular
          </button>

          {chips.map((code) => (
            <button
              key={code}
              onClick={() => toggle(code)}
              className={`shrink-0 h-8 px-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${chipClass(
                selected.includes(code)
              )}`}
            >
              <img src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} alt={code} className="w-[18px] h-[18px] rounded-full object-cover mr-1.5 inline-block shrink-0 shadow-sm" />
              {countryName(code)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Filter by country"
          className={`shrink-0 relative w-8 h-8 rounded-full flex items-center justify-center ${
            isOverlay ? 'bg-white/20 text-white' : 'bg-surface-sunken text-ink-soft'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {!isAll && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-accent-500 text-white text-[9px] font-bold flex items-center justify-center">
              {selected.length}
            </span>
          )}
        </button>
      </div>

      <CountryPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={selected}
        onApply={setSelected}
        liveCodes={liveCodes}
      />
    </>
  );
};
