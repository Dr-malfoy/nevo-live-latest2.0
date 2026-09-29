import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PiCaretDownBold as ChevronDown, PiTrophyFill as Trophy } from 'react-icons/pi';
import {
  rankingApi,
  type RankingBoard,
  type RankingConfig,
  type RankingPeriod,
  type RankingResult,
} from '../api/progress.api';
import { optional } from '../api/pending';
import { useCountryStore } from '../stores';
import {
  ScreenHeader,
  TabBar,
  PillTabs,
  CountdownPill,
  EmptyState,
  HelpButton,
  PendingApiNotice,
} from '../components/common';
import { CountryPickerSheet } from '../components/filter';
import { Avatar, UserNameplate } from '../components/user';
import { Loading } from '../components/ui';
import { flagEmoji } from '../lib/countries';
import { compactNumber } from '../lib/time';

/**
 * Rankings — requirements #28, #35, #36, #37, #38 and #71.
 *
 * Six screens in the documents, one screen here. They differ only by which
 * board is selected and what the metric is called, which is exactly what
 * `GET /api/rankings` returns (BACKEND-GUIDE.md §4.5) — so building six
 * screens would have meant six copies of the same list.
 */

type Category = 'host' | 'agent' | 'earnings';

const CATEGORIES: { key: Category; label: string; hero: string }[] = [
  { key: 'host', label: 'Host', hero: 'from-[#5B3AA8] to-[#3B2470]' },
  { key: 'agent', label: 'Agent', hero: 'from-[#FF6B9D] to-[#FF8FAB]' },
  { key: 'earnings', label: 'Earnings', hero: 'from-[#2B6CB0] to-[#1A4480]' },
];

const BOARDS: Record<Category, { key: RankingBoard; label: string }[]> = {
  host: [
    { key: 'host_daily', label: 'Daily' },
    { key: 'rocket_host', label: 'Rocket Host' },
    { key: 'star_host', label: 'Star host' },
    { key: 'esports_host', label: 'Esports Host' },
  ],
  agent: [
    { key: 'agent_count', label: 'Count' },
    { key: 'agent_income', label: 'Income' },
    { key: 'elite_agent', label: 'Elite Agent' },
  ],
  earnings: [
    { key: 'earnings', label: 'Earnings' },
    { key: 'rich', label: 'Rich' },
    { key: 'gift', label: 'Gift' },
    { key: 'video', label: 'Video' },
  ],
};

const PERIODS: { key: RankingPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'Current Week' },
  { key: 'month', label: 'This Month' },
];

/** Weekly boards default to the week, daily boards to today. */
const defaultPeriod = (board: RankingBoard): RankingPeriod =>
  board === 'rocket_host' || board === 'star_host' ? 'week' : 'today';

const categoryOf = (board: RankingBoard): Category => {
  if (BOARDS.host.some((b) => b.key === board)) return 'host';
  if (BOARDS.agent.some((b) => b.key === board)) return 'agent';
  return 'earnings';
};

const MEDALS = ['🥇', '🥈', '🥉'];

export const Rankings = () => {
  const [params, setParams] = useSearchParams();
  const selectedCountries = useCountryStore((s) => s.selected);
  const setSelectedCountries = useCountryStore((s) => s.setSelected);

  const initialBoard = (params.get('board') as RankingBoard) || 'host_daily';
  const [board, setBoard] = useState<RankingBoard>(initialBoard);
  const [period, setPeriod] = useState<RankingPeriod>(defaultPeriod(initialBoard));
  const [scope, setScope] = useState<'global' | 'friends'>('global');
  const [countryOpen, setCountryOpen] = useState(false);

  const [result, setResult] = useState<RankingResult | null>(null);
  const [config, setConfig] = useState<RankingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const category = categoryOf(board);
  const hero = CATEGORIES.find((c) => c.key === category)!.hero;

  const selectBoard = (next: RankingBoard) => {
    setBoard(next);
    setPeriod(defaultPeriod(next));
    setParams({ board: next }, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      optional(
        rankingApi.get({
          board,
          period,
          scope,
          country: selectedCountries.length ? selectedCountries.join(',') : undefined,
        })
      ).catch(() => null),
      optional(rankingApi.getConfig(board)).catch(() => null),
    ])
      .then(([res, cfg]) => {
        if (cancelled) return;
        if (res?.success && res.data?.rows) {
          setResult(res.data);
          setLive(true);
        } else {
          setResult(null);
          setLive(false);
        }
        setConfig(cfg?.data ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [board, period, scope, selectedCountries.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const countryLabel = useMemo(() => {
    if (selectedCountries.length === 0) return '🌍 All';
    if (selectedCountries.length <= 2) return selectedCountries.map((c) => flagEmoji(c)).join(' ');
    return `${selectedCountries.slice(0, 2).map(flagEmoji).join(' ')} +${selectedCountries.length - 2}`;
  }, [selectedCountries]);

  const rows = result?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      {/* Coloured hero, per category */}
      <div className={`bg-gradient-to-b ${hero}`}>
        <ScreenHeader title="" variant="media" right={<HelpButton light />}>
          <div className="px-4">
            <TabBar
              tabs={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
              active={category}
              onChange={(next) => selectBoard(BOARDS[next][0].key)}
              tone="light"
            />
          </div>

          <PillTabs
            tabs={BOARDS[category].map((b) => ({ key: b.key, label: b.label }))}
            active={board}
            onChange={(k) => selectBoard(k as RankingBoard)}
            tone="light"
            className="px-4 pt-3"
          />

          {/* Countdown + country + period */}
          <div className="flex items-center gap-2 px-4 py-3">
            <CountdownPill to={result?.resetsAt} tone="light" />
            <button
              onClick={() => setCountryOpen(true)}
              className="h-8 px-3 rounded-full bg-white/20 text-white text-sm font-medium flex items-center gap-1 shrink-0"
            >
              📍 {countryLabel}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                const index = PERIODS.findIndex((p) => p.key === period);
                setPeriod(PERIODS[(index + 1) % PERIODS.length].key);
              }}
              className="h-8 px-3 rounded-full bg-white/20 text-white text-sm font-medium flex items-center gap-1 shrink-0 ml-auto"
            >
              ⇄ {PERIODS.find((p) => p.key === period)?.label}
            </button>
          </div>

          {/* #71 — global vs friends */}
          {category === 'earnings' && (
            <div className="px-4 pb-3">
              <PillTabs
                tabs={[
                  { key: 'global', label: 'Global' },
                  { key: 'friends', label: 'My Friends' },
                ]}
                active={scope}
                onChange={(k) => setScope(k as 'global' | 'friends')}
                tone="light"
              />
            </div>
          )}
        </ScreenHeader>

        {/* Condition bar */}
        {config?.condition && (
          <p className="mx-3 mb-3 px-3 py-2 rounded-lg bg-[#F97316] text-white text-[13px] font-medium">
            {config.condition}
          </p>
        )}
      </div>

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : rows.length === 0 ? (
        <>
          <EmptyState
            icon={<Trophy className="w-6 h-6" />}
            title={live ? 'No one ranked yet' : 'Rankings not connected'}
            hint={live ? 'Check back after the next reset.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.5" what="Ranking data" />}
        </>
      ) : (
        <>
          {/* Prize podium — #35's pool card */}
          {config?.prizes && config.prizes.length >= 3 && (
            <div className="mx-3 -mt-1 mb-3 rounded-card bg-gradient-to-b from-[#C13B7A] to-[#8E2457] p-4">
              {config.poolTotal && (
                <p className="text-center text-white font-bold text-lg tabular-nums mb-3">
                  🏆 {compactNumber(config.poolTotal)}
                </p>
              )}
              <div className="flex items-end justify-center gap-3">
                {[1, 0, 2].map((slot) => (
                  <div key={slot} className="flex flex-col items-center gap-1">
                    <span className="text-2xl">{MEDALS[slot]}</span>
                    <span className="h-6 px-2 rounded-full bg-white/20 text-white text-[11px] font-bold flex items-center tabular-nums">
                      {compactNumber(config.prizes![slot])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top three */}
          {podium.length > 0 && (
            <div className="mx-3 mb-2 bg-white rounded-card divide-y divide-line overflow-hidden">
              {podium.map((row) => (
                <RankRow key={row.user._id} row={row} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div className="mx-3 bg-white rounded-card divide-y divide-line overflow-hidden">
              {rest.map((row) => (
                <RankRow key={row.user._id} row={row} />
              ))}
            </div>
          )}

          {/* Footer — my distance to the next rank */}
          {result?.me && (
            <div className="mx-3 mt-3 rounded-card bg-white px-4 py-3 flex items-center gap-2">
              <span className="text-sm text-ink-muted">Distance from rank is:</span>
              <span className="h-6 px-2 rounded-full bg-accent-50 text-accent-600 text-[11px] font-bold flex items-center">
                {result.me.metricLabel || 'Metric'}
              </span>
              <span className="font-bold text-ink tabular-nums">
                {compactNumber(result.me.distanceToNext ?? 0)}
              </span>
            </div>
          )}
        </>
      )}

      <CountryPickerSheet
        isOpen={countryOpen}
        onClose={() => setCountryOpen(false)}
        selected={selectedCountries}
        onApply={setSelectedCountries}
      />
    </div>
  );
};

/**
 * One leaderboard row — identical for every board, which is the whole point of
 * the single-endpoint design. Only `metricLabel` and the optional
 * earnings/prize/badge change between boards.
 */
function RankRow({ row }: { row: RankingResult['rows'][number] }) {
  const navigate = useNavigate();
  const medal = row.rank <= 3 ? MEDALS[row.rank - 1] : null;

  return (
    <button
      onClick={() => navigate(`/user/${row.user._id}`)}
      className="w-full flex items-center gap-2.5 px-3 py-3 text-left active:bg-surface-sunken transition-colors"
    >
      <span className="w-7 shrink-0 text-center">
        {medal ? (
          <span className="text-xl leading-none">{medal}</span>
        ) : (
          <span className="text-sm font-bold text-ink-faint tabular-nums">{row.rank}</span>
        )}
      </span>

      <Avatar
        src={row.user.avatar}
        nickname={row.user.nickname}
        size="md"
        online={row.user.online}
        className={row.frame === 'gold' ? 'ring-2 ring-role-seller rounded-full' : ''}
      />

      <div className="flex-1 min-w-0">
        <UserNameplate user={row.user} size="sm" showRoles={false} showOnline={false} wrap />
        {row.badge && (
          <span className="inline-flex items-center mt-1 h-[17px] px-1.5 rounded bg-accent-50 text-accent-600 text-[9px] font-bold">
            {row.badge}
          </span>
        )}
      </div>

      <div className="flex flex-col items-end shrink-0">
        {row.earnings != null && (
          <span className="text-sm font-bold text-ink tabular-nums">
            💰 {compactNumber(row.earnings)}
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-ink-muted tabular-nums">
          <span className="h-[17px] px-1.5 rounded bg-surface-sunken text-[10px] font-bold flex items-center">
            {row.metricLabel}
          </span>
          {compactNumber(row.metric)}
        </span>
        {row.prize != null && (
          <span className="text-[11px] font-semibold text-primary-600 tabular-nums">
            {compactNumber(row.prize)}
          </span>
        )}
      </div>
    </button>
  );
}
