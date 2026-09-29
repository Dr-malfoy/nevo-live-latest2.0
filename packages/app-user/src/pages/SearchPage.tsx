import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio, PiMagnifyingGlassBold as Search, PiTrashFill as Trash2 } from 'react-icons/pi';
import { usersApi, streamsApi } from '../api';
import { useCountryStore } from '../stores';
import { UserListRow } from '../components/user';
import { StreamCard } from '../components/stream';
import { Loading } from '../components/ui';
import type { LiveStream, UserPublic } from '../types';

/**
 * Requirement #64 — universal search.
 *
 * Search history lives in localStorage rather than on the server: it's
 * per-device, the reference screenshot shows plain IDs, and it should never
 * cost a round-trip to read.
 */

const HISTORY_KEY = 'search-history';
const HISTORY_MAX = 12;

const readHistory = (): string[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
};

const writeHistory = (items: string[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_MAX)));
  } catch {
    /* private mode / blocked storage — history is a convenience, not a requirement */
  }
};

const TABS = [
  { key: 'for_you', label: 'For You' },
  { key: 'live', label: 'Live Ranking' },
  { key: 'video', label: 'Video Ranking' },
  { key: 'topic', label: 'Topic Ranking' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export const SearchPage = () => {
  const navigate = useNavigate();
  const selectedCountries = useCountryStore((s) => s.selected);

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>(readHistory);
  const [results, setResults] = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [tab, setTab] = useState<TabKey>('for_you');
  const [forYou, setForYou] = useState<LiveStream[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // The "For You" grid under the search box — live streams, using the feed we have.
  useEffect(() => {
    let cancelled = false;
    streamsApi
      .getFeed({ tab: 'popular', limit: 12, countries: selectedCountries })
      .then(({ data }) => {
        if (!cancelled && data.success) setForYou(data.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingFeed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCountries.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async (term: string) => {
    const q = term.trim();
    if (!q) return;

    setQuery(q);
    setSearching(true);
    setSearched(true);

    const next = [q, ...history.filter((h) => h !== q)];
    setHistory(next);
    writeHistory(next);

    try {
      const { data } = await usersApi.searchUsers(q, {
        ...(selectedCountries.length > 0 ? { country: selectedCountries.join(',') } : {}),
      });
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const leftCol = useMemo(() => forYou.filter((_, i) => i % 2 === 0), [forYou]);
  const rightCol = useMemo(() => forYou.filter((_, i) => i % 2 === 1), [forYou]);

  return (
    <div className="min-h-screen bg-white">
      {/* Search bar (#64.1) */}
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-2 px-4 h-14">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
              placeholder="Enter user ID/nickname/live/videos"
              className="w-full h-11 pl-9 pr-3 rounded-full bg-surface-sunken text-ink placeholder:text-ink-faint truncate
                border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={() => (searched ? clearSearch() : navigate(-1))}
            className="text-sm font-bold text-ink shrink-0"
          >
            Cancel
          </button>
        </div>
      </header>

      {searched ? (
        searching ? (
          <Loading className="pt-20" size="lg" />
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-ink-muted py-16 px-8">
            No one found for “{query}”. Try a different ID or name.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {results.map((u) => (
              <UserListRow key={u._id} user={u} showFollow />
            ))}
          </div>
        )
      ) : (
        <>
          {/* Search history (#64.2) */}
          {history.length > 0 && (
            <section className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="font-bold text-ink">Search History</h2>
                <button
                  onClick={() => {
                    setHistory([]);
                    writeHistory([]);
                  }}
                  aria-label="Clear search history"
                  className="text-ink-ghost p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={item}
                    onClick={() => runSearch(item)}
                    className="h-9 px-3.5 rounded-full bg-white border border-line text-sm text-ink"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* For You / rankings (#64.3) */}
          <section className="pt-5">
            <div className="flex items-center gap-5 px-4 overflow-x-auto no-scrollbar">
              {TABS.map(({ key, label }) => {
                const active = tab === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`relative shrink-0 pb-2.5 text-[15px] transition-colors ${
                      active ? 'text-ink font-bold' : 'text-ink-faint font-medium'
                    }`}
                  >
                    {label}
                    {active && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-black text-white" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-line pt-3">
              {tab !== 'for_you' ? (
                <p className="text-center text-sm text-ink-muted py-16 px-8 leading-relaxed">
                  Rankings aren't connected yet — the ranking API is specified in API-SPEC.md
                  and serves this tab once it ships.
                </p>
              ) : loadingFeed ? (
                <Loading className="pt-12" />
              ) : forYou.length === 0 ? (
                <div className="text-center py-16 px-8">
                  <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4">
                    <Radio className="w-6 h-6 text-ink-ghost" />
                  </div>
                  <p className="text-sm text-ink-muted">Nothing live to recommend right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 px-4 pb-6">
                  <div className="space-y-3">
                    {leftCol.map((s) => (
                      <StreamCard key={s._id} stream={s} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {rightCol.map((s) => (
                      <StreamCard key={s._id} stream={s} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
