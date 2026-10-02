import { useState, useRef, useEffect, forwardRef } from 'react';
import { PiCaretDownBold as CaretDown, PiMagnifyingGlassBold as Search, PiXBold as X } from 'react-icons/pi';
import { allCountryDialOptions, flagEmoji, countryDialCode } from '../../lib/countries';

export interface PhoneInputWithCountryProps {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string;
}

export const formatFullPhoneNumber = (countryCode: string, localPhone: string): string => {
  const dial = countryDialCode(countryCode);
  let cleanNumber = localPhone.replace(/\D/g, '');
  // Strip leading zero if present (e.g. 01712345678 -> 1712345678 for +880)
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.slice(1);
  }
  return `${dial}${cleanNumber}`;
};

export const PhoneInputWithCountry = forwardRef<HTMLInputElement, PhoneInputWithCountryProps>(
  (
    {
      countryCode = 'BD',
      onCountryCodeChange,
      phone,
      onPhoneChange,
      placeholder = 'Phone number',
      disabled = false,
      autoFocus = false,
      className = '',
      error,
    },
    ref
  ) => {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const pickerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const countryOptions = allCountryDialOptions();
    const currentDial = countryDialCode(countryCode);
    const currentFlag = flagEmoji(countryCode);

    const filteredOptions = countryOptions.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dialCode.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Auto focus search when picker opens
    useEffect(() => {
      if (isPickerOpen) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      } else {
        setSearchQuery('');
      }
    }, [isPickerOpen]);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
          setIsPickerOpen(false);
        }
      };
      if (isPickerOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isPickerOpen]);

    const handleSelectCountry = (code: string) => {
      onCountryCodeChange(code);
      setIsPickerOpen(false);
    };

    return (
      <div className="w-full relative" ref={pickerRef}>
        <div
          className={`flex items-center rounded-xl bg-surface-sunken border ${
            error
              ? 'border-role-host'
              : 'border-transparent focus-within:border-accent-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-accent-500'
          } transition-all overflow-hidden ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
        >
          {/* Country Code Selector Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="flex items-center gap-1.5 px-3.5 py-3 bg-surface hover:bg-surface-soft border-r border-line text-ink font-semibold text-sm shrink-0 transition-colors"
            title="Select Country Code"
          >
            <span className="text-lg leading-none">{currentFlag}</span>
            <span className="text-xs font-bold text-ink">{currentDial}</span>
            <CaretDown className={`w-3.5 h-3.5 text-ink-muted transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile Phone Input */}
          <input
            ref={ref}
            type="tel"
            value={phone}
            disabled={disabled}
            autoFocus={autoFocus}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent px-3.5 py-3 text-ink text-sm placeholder:text-ink-faint focus:outline-none"
          />
        </div>

        {error && <p className="mt-1.5 text-xs text-role-host">{error}</p>}

        {/* Dropdown / Modal for Country Selection */}
        {isPickerOpen && (
          <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-line max-h-72 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Search Box */}
            <div className="p-2.5 border-b border-line bg-surface-soft flex items-center gap-2">
              <Search className="w-4 h-4 text-ink-muted shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-ink-muted hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-line/60">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-muted">No country found</div>
              ) : (
                filteredOptions.map((item) => {
                  const isSelected = item.code === countryCode;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelectCountry(item.code)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                        isSelected ? 'bg-accent-50 text-accent-700 font-bold' : 'hover:bg-surface-soft text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg leading-none shrink-0">{item.flag}</span>
                        <span className="truncate">{item.name}</span>
                        <span className="text-[10px] text-ink-faint uppercase font-mono">({item.code})</span>
                      </div>
                      <span className="font-bold text-ink-muted tabular-nums shrink-0 ml-2">{item.dialCode}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PhoneInputWithCountry.displayName = 'PhoneInputWithCountry';
