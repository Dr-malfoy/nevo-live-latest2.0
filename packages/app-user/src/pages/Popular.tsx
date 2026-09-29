import { useEffect } from 'react';
import { PiFireFill as Flame } from 'react-icons/pi';
import { useStreamStore, useCountryStore } from '../stores';
import { StreamCard } from '../components/stream';
import { CountryFilterBar } from '../components/filter';
import { Loading } from '../components/ui';
import { countryName } from '../lib/countries';

export const Popular = () => {
  const { streams, isLoading, fetchStreams, setActiveTab } = useStreamStore();
  const selectedCountries = useCountryStore((s) => s.selected);
  const clearCountries = useCountryStore((s) => s.clear);

  useEffect(() => {
    setActiveTab('popular');
    fetchStreams('popular');
    // Periodic refetch so ended/offline streams drop off without a reload.
    const t = setInterval(() => fetchStreams('popular'), 15_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries.join(',')]);

  const leftCol = streams.filter((_, i) => i % 2 === 0);
  const rightCol = streams.filter((_, i) => i % 2 === 1);
  const filterLabel = selectedCountries.map(countryName).join(', ');

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-[22px] font-bold text-ink flex items-center gap-2">
          <Flame className="w-5 h-5 text-role-seller" />
          Popular
        </h1>
      </div>

      {/* Requirement #1 — country filter bar */}
      <CountryFilterBar className="px-4 pb-3" />

      {isLoading ? (
        <Loading className="pt-20" size="lg" />
      ) : streams.length === 0 ? (
        <div className="text-center pt-20 px-8">
          <p className="text-base font-semibold text-ink mb-1">
            {filterLabel ? `No one live in ${filterLabel}` : 'Nothing popular right now'}
          </p>
          <p className="text-sm text-ink-muted">Check back in a bit.</p>
          {filterLabel && (
            <button onClick={clearCountries} className="mt-4 h-9 px-4 btn-secondary text-sm">
              Show all countries
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          <div className="space-y-3">
            {leftCol.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
          <div className="space-y-3">
            {rightCol.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
