import { useEffect, useMemo, useState } from 'react';
import { PiCheckBold as Check, PiMagnifyingGlassBold as Search, PiXBold as X } from 'react-icons/pi';
import { ALL_COUNTRIES, allCountries, countryName, flagEmoji, sortForFilterBar } from '../../lib/countries';

interface CountryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Currently selected codes; empty means All. */
  selected: string[];
  onApply: (codes: string[]) => void;
  /** Codes that currently have live hosts — shown first, with a "Live" hint. */
  liveCodes?: string[];
}

/**
 * Requirement #1 — "Multi Select + Search Option".
 *
 * Edits a local draft and only commits on Apply, so backing out of the sheet
 * leaves the feed untouched.
 */
export const CountryPickerSheet = ({
  isOpen,
  onClose,
  selected,
  onApply,
  liveCodes = [],
}: CountryPickerSheetProps) => {
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');

  // Re-seed the draft each time the sheet opens so it always reflects reality.
  useEffect(() => {
    if (isOpen) {
      setDraft(selected);
      setQuery('');
    }
  }, [isOpen, selected]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const liveSet = useMemo(() => new Set(liveCodes.map((c) => c.toUpperCase())), [liveCodes]);

  const rows = useMemo(() => {
    const known = allCountries();
    // Countries that are live but not in the static name table still deserve a row.
    const extras = liveCodes
      .map((c) => c.toUpperCase())
      .filter((c) => !known.some((k) => k.code === c))
      .map((code) => ({ code, name: countryName(code) }));

    const all = [...known, ...extras];
    const term = query.trim().toLowerCase();
    const filtered = term
      ? all.filter((c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term))
      : all;

    // Live countries float to the top; the rest keep the filter-bar ordering.
    const order = sortForFilterBar([
      ...filtered.filter((c) => liveSet.has(c.code)).map((c) => c.code),
      ...filtered.filter((c) => !liveSet.has(c.code)).map((c) => c.code),
    ]);
    const byCode = new Map(filtered.map((c) => [c.code, c]));
    return order.map((code) => byCode.get(code)!).filter(Boolean);
  }, [query, liveCodes, liveSet]);

  const toggle = (code: string) =>
    setDraft((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-sheet max-h-[82vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
          <button onClick={onClose} className="text-ink-muted p-1 -ml-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-bold text-ink">Select Country</h3>
          <button
            onClick={() => setDraft([])}
            className="text-sm font-semibold text-accent-500 disabled:text-ink-ghost"
            disabled={draft.length === 0}
          >
            Reset
          </button>
        </div>

        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {/* "All" clears the selection entirely. */}
          <button
            onClick={() => setDraft([])}
            className="w-full flex items-center gap-3 h-14 border-b border-line"
          >
            <span className="text-2xl leading-none">{flagEmoji(ALL_COUNTRIES)}</span>
            <span className="flex-1 text-left font-semibold text-ink">All Countries</span>
            {draft.length === 0 && <Check className="w-5 h-5 text-accent-500" />}
          </button>

          {rows.map(({ code, name }) => {
            const checked = draft.includes(code);
            return (
              <button
                key={code}
                onClick={() => toggle(code)}
                className="w-full flex items-center gap-3 h-14 border-b border-line"
              >
                <span className="text-2xl leading-none">{flagEmoji(code)}</span>
                <span className="flex-1 text-left text-ink">{name}</span>
                {liveSet.has(code) && (
                  <span className="text-[10px] font-bold text-status-live bg-status-live/10 px-1.5 py-0.5 rounded">
                    LIVE
                  </span>
                )}
                <span
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    checked ? 'bg-accent-500 border-accent-500' : 'border-line-strong'
                  }`}
                >
                  {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}

          {rows.length === 0 && (
            <p className="text-center text-sm text-ink-muted py-10">No country matches “{query}”.</p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-line safe-bottom shrink-0">
          <button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="w-full h-12 btn-primary"
          >
            {draft.length === 0 ? 'Show All Countries' : `Apply (${draft.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};
