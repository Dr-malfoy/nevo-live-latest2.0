import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PiCaretDownBold, PiCheckBold, PiMagnifyingGlassBold, PiXBold } from 'react-icons/pi';
import { allCountries, countryName } from '../../lib/countries';
import { CountryFlag } from './CountryFlag';

export interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Select Your Country',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const countries = useMemo(() => allCountries(), []);

  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  const selectedCountryName = value ? countryName(value) : '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 bg-white border rounded-xl flex items-center justify-between text-xs font-bold transition-all shadow-2xs ${
          disabled
            ? 'border-line bg-surface-sunken opacity-70 cursor-not-allowed text-ink-muted'
            : isOpen
            ? 'border-[#4C3BFF] ring-2 ring-[#4C3BFF]/20 text-ink'
            : 'border-line-strong hover:border-[#4C3BFF] text-ink'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CountryFlag code={value} size="md" />
          {value ? (
            <span className="truncate">
              {selectedCountryName}{' '}
              <span className="text-[10px] text-ink-muted font-normal">({value.toUpperCase()})</span>
            </span>
          ) : (
            <span className="text-ink-muted font-normal">{placeholder}</span>
          )}
        </div>
        <PiCaretDownBold
          className={`w-3.5 h-3.5 text-ink-muted shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-line max-h-72 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Box */}
          <div className="p-2.5 border-b border-line bg-surface-sunken flex items-center gap-2">
            <PiMagnifyingGlassBold className="w-4 h-4 text-ink-muted shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country or code..."
              className="w-full bg-transparent text-xs font-medium text-ink placeholder:text-ink-faint focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-ink-muted hover:text-ink rounded-full"
              >
                <PiXBold className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Countries List */}
          <div className="flex-1 overflow-y-auto divide-y divide-line/40 overscroll-contain">
            {filteredCountries.length === 0 ? (
              <div className="p-5 text-center text-xs text-ink-muted">No countries found</div>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[#4C3BFF]/10 text-[#4C3BFF] font-bold'
                        : 'hover:bg-surface-sunken text-ink font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag code={c.code} size="md" />
                      <span className="truncate">{c.name}</span>
                      <span className="text-[10px] text-ink-muted font-mono font-normal">
                        ({c.code})
                      </span>
                    </div>
                    {isSelected && (
                      <PiCheckBold className="w-4 h-4 text-[#4C3BFF] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
