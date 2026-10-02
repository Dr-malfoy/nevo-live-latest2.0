import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiCaretDownBold as ChevronDown, PiCaretRightBold as ChevronRight, PiQuestionFill as HelpCircle, PiArrowsLeftRightFill as TransferIcon, PiCoinsFill as CoinBag, PiShieldCheckFill as ShieldCheck } from 'react-icons/pi';
import { incomeApi, usersApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import type { IncomeRange, IncomeSource, IncomeSummary } from '../api/income.api';

/**
 * Income Dashboard — displays user earned Coins.
 *
 * All earned funds (live gifts, party income, game winnings, commissions) are counted in Coins.
 * Coins cannot be directly withdrawn via automated bank payouts; instead, users trade/sell coins via certified agencies/agents.
 */

const RANGES: { key: IncomeRange; label: string }[] = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

const SOURCE_LABELS: Record<string, string> = {
  livestream: 'Livestream Gifts',
  party: 'Party Income',
  commission: 'Commission',
  transfer: 'Transfer Coins',
  platform_rewards: 'Game Winnings & Rewards',
};

const EMPTY_SOURCES: IncomeSource[] = Object.entries(SOURCE_LABELS).map(([key, label]) => ({
  key: key as IncomeSource['key'],
  label,
  points: 0,
}));

/** Ledger `type` → buckets */
const TYPE_TO_SOURCE: Record<string, IncomeSource['key']> = {
  gift_receive: 'livestream',
  commission: 'commission',
  transfer: 'transfer',
  daily_reward: 'platform_rewards',
  game_win: 'platform_rewards',
};

const rangeStart = (range: IncomeRange): number => {
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
};

export const Income = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showToast = useUIStore((s) => s.showToast);

  const [range, setRange] = useState<IncomeRange>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [summary, setSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [derived, setDerived] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    usersApi
      .getProfile()
      .then(({ data }) => {
        if (!cancelled && data.success && data.data) updateUser(data.data);
      })
      .catch(() => {});

    const loadSummary = async (): Promise<IncomeSummary | null> => {
      const res = await optional(incomeApi.getSummary(range)).catch(() => null);
      const payload = res?.data as IncomeSummary | undefined;
      if (!payload || typeof payload.available !== 'number' || !Array.isArray(payload.sources)) {
        return null;
      }
      return payload;
    };

    const loadFallback = async (): Promise<IncomeSummary> => {
      const { data } = await incomeApi.getTransactions({ limit: 200 });
      const rows = data.success ? data.data || [] : [];
      const since = rangeStart(range);

      const totals: Record<string, number> = {};
      let unconfirmed = 0;

      for (const row of rows) {
        if (new Date(row.createdAt).getTime() < since) continue;
        if (row.amount <= 0) continue;

        if (row.status === 'pending') {
          unconfirmed += row.amount;
          continue;
        }
        if (row.status !== 'completed') continue;

        const key = TYPE_TO_SOURCE[row.type];
        if (!key) continue;
        totals[key] = (totals[key] || 0) + row.amount;
      }

      const available = user?.coins ?? 0;
      return {
        available,
        unconfirmed,
        total: available + unconfirmed,
        range,
        sources: EMPTY_SOURCES.map((s) => ({ ...s, points: totals[s.key] || 0 })),
      };
    };

    (async () => {
      try {
        const live = await loadSummary();
        if (cancelled) return;
        if (live) {
          setSummary({
            ...live,
            available: user?.coins ?? live.available,
          });
          setDerived(false);
        } else {
          setSummary(await loadFallback());
          setDerived(true);
        }
      } catch {
        if (!cancelled) {
          setSummary({
            available: user?.coins ?? 0,
            unconfirmed: 0,
            total: user?.coins ?? 0,
            range,
            sources: EMPTY_SOURCES,
          });
          setDerived(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, user?.coins]);

  const rangeLabel = useMemo(() => RANGES.find((r) => r.key === range)?.label ?? '', [range]);

  return (
    <div className="min-h-screen bg-surface-soft pb-10">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Income (Coins)</h1>
          <button
            onClick={() => navigate('/wallet')}
            className="text-sm font-semibold text-accent-500"
          >
            Details
          </button>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          {/* ── Balance Card (Available Earned Coins) ─────────────────────────────────── */}
          <div className="m-3 rounded-card p-4 bg-gradient-to-br from-[#FFF5DC] to-[#FFE8A3] border border-amber-200/60 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-900/80 uppercase tracking-wider">Available Coins</p>
              <CoinIcon className="w-7 h-7 text-amber-500" />
            </div>
            <p className="text-[36px] leading-tight font-extrabold text-ink tabular-nums mt-1">
              {(user?.coins ?? summary?.available ?? 0).toLocaleString()}
            </p>

            <div className="flex items-stretch gap-4 mt-3 pt-3 border-t border-amber-900/10">
              <div className="flex-1">
                <p className="text-[11px] text-ink-muted">Total Earned</p>
                <p className="text-base font-bold text-ink tabular-nums">
                  {(summary?.total ?? (user?.coins ?? 0)).toLocaleString()}
                </p>
              </div>
              <div className="w-px bg-amber-900/10" />
              <div className="flex-1">
                <p className="text-[11px] text-ink-muted flex items-center gap-1">
                  Settling / Pending
                  <span title="Coins currently in settlement process">
                    <HelpCircle className="w-3 h-3 text-ink-muted" />
                  </span>
                </p>
                <p className="text-base font-bold text-ink tabular-nums">
                  {(summary?.unconfirmed ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* ── Cash Flow Policy Notice ── */}
          <div className="mx-3 rounded-xl bg-[#0F1E36] p-3.5 flex items-start gap-2.5 text-white text-xs leading-relaxed shadow-sm">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-400 mb-0.5">Agency Coin Trading System</p>
              <p className="text-white/80">
                All earned rewards and winnings are counted in <span className="text-amber-300 font-bold">Coins</span>. Users trade coins directly through official certified agencies & agents.
              </p>
            </div>
          </div>

          {/* ── Income by source ────────────────────────────── */}
          <div className="mx-3 mt-3 bg-white rounded-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 h-14 border-b border-line">
              <h2 className="font-bold text-ink">Income Streams</h2>
              <div className="relative">
                <button
                  onClick={() => setRangeOpen((v) => !v)}
                  className="h-8 px-3 rounded-full bg-surface-sunken text-sm text-ink-soft flex items-center gap-1 active:scale-95 transition-transform"
                >
                  {rangeLabel}
                  <ChevronDown className="w-4 h-4" />
                </button>
                {rangeOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-card-hover overflow-hidden border border-line">
                      {RANGES.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => {
                            setRange(r.key);
                            setRangeOpen(false);
                          }}
                          className={`w-full h-11 px-4 text-left text-sm border-b border-line last:border-0 ${
                            r.key === range ? 'text-accent-500 font-semibold bg-accent-50/50' : 'text-ink hover:bg-surface-soft'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {(summary?.sources ?? EMPTY_SOURCES).map((source) => (
              <div
                key={source.key}
                className="w-full flex items-center gap-2.5 px-4 h-14 border-b border-line last:border-0"
              >
                <span className="flex-1 text-left text-sm font-medium text-ink">{source.label}</span>
                <CoinIcon className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-bold text-ink tabular-nums text-sm">
                  {source.points.toLocaleString()}
                </span>
                <span className="text-xs text-ink-muted">Coins</span>
              </div>
            ))}
          </div>

          {/* ── Action Buttons for Coin Trading & Transfer ─────────────────────────────────────── */}
          <div className="px-3 mt-4 space-y-2.5">
            <button
              onClick={() => navigate('/sell')}
              className="w-full h-12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md shadow-amber-500/20"
            >
              <CoinBag className="w-5 h-5" />
              Sell / Trade Coins to Agency
            </button>

            <button
              onClick={() => navigate('/transfer')}
              className="w-full h-12 rounded-full bg-white border-2 border-amber-500 text-amber-700 font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-sm"
            >
              <TransferIcon className="w-5 h-5" />
              Transfer Coins to Agent / User
            </button>

            <button
              onClick={() => navigate('/agent')}
              className="w-full h-11 rounded-full bg-surface-sunken text-ink-soft text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-line transition-colors"
            >
              <span>Contact My Linked Agency</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
