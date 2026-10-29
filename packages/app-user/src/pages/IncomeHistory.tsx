import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiVideoCameraFill as VideoIcon,
  PiConfettiFill as PartyIcon,
  PiPercentBold as CommissionIcon,
  PiArrowsLeftRightFill as TransferIcon,
  PiGiftFill as RewardIcon,
  PiCoinsFill as CoinBag,
  PiCalendarBlankFill as CalendarIcon,
  PiCaretRightBold as ChevronRight,
  PiArrowsClockwiseBold as RefreshIcon,
} from 'react-icons/pi';
import { incomeApi, IncomeEntry, IncomeSourceKey, SOURCE_LABELS } from '../api/income.api';
import { optional } from '../api/pending';
import { Loading } from '../components/ui';
import { Avatar } from '../components/user';
import { CoinIcon } from '../components/ui/CurrencyIcon';

interface SourceMeta {
  title: string;
  subtitle: string;
  icon: typeof VideoIcon;
  gradient: string;
  badgeBg: string;
  badgeText: string;
}

const SOURCE_META: Record<IncomeSourceKey, SourceMeta> = {
  livestream: {
    title: 'Live Stream Earning',
    subtitle: 'Gifts and rewards received during live video streams',
    icon: VideoIcon,
    gradient: 'from-rose-500/10 via-amber-500/10 to-transparent',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'Live Stream',
  },
  party: {
    title: 'Party Earning',
    subtitle: 'Coins earned from multi-guest party audio & video rooms',
    icon: PartyIcon,
    gradient: 'from-amber-500/10 via-orange-500/10 to-transparent',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'Party Room',
  },
  commission: {
    title: 'Commission',
    subtitle: 'Agency share & lifetime referral commission earnings',
    icon: CommissionIcon,
    gradient: 'from-emerald-500/10 via-teal-500/10 to-transparent',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'Commission',
  },
  transfer: {
    title: 'Transfer Point',
    subtitle: 'Coins & points received from agent or peer transfers',
    icon: TransferIcon,
    gradient: 'from-sky-500/10 via-cyan-500/10 to-transparent',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeText: 'Transfer In',
  },
  platform_rewards: {
    title: 'Platform Rewards',
    subtitle: 'Daily check-ins, tasks, games & official platform incentives',
    icon: RewardIcon,
    gradient: 'from-amber-500/10 via-yellow-500/10 to-transparent',
    badgeBg: 'bg-yellow-50 text-amber-800 border-yellow-200',
    badgeText: 'Rewards',
  },
};

const RANGES: { key: string; label: string; days: number }[] = [
  { key: '1y', label: 'Last 1 Year', days: 365 },
  { key: '30d', label: 'Last 30 Days', days: 30 },
  { key: '7d', label: 'Last 7 Days', days: 7 },
  { key: '24h', label: 'Last 24 Hours', days: 1 },
  { key: 'all', label: 'All Time', days: 0 },
];

export const IncomeHistory = () => {
  const { source } = useParams<{ source: string }>();
  const navigate = useNavigate();

  // Validate or fallback source key
  const validKey: IncomeSourceKey = (
    source && source in SOURCE_META ? source : 'livestream'
  ) as IncomeSourceKey;

  const meta = SOURCE_META[validKey];

  const [range, setRange] = useState<string>('1y'); // Default: 1 year history
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load history from API with fallback
  const fetchHistory = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await optional(
        incomeApi.getSource(validKey, {
          range,
          page: pageNum,
          limit: 20,
        })
      ).catch(() => null);

      if (res?.data && Array.isArray(res.data)) {
        const rows = res.data;
        const total = (res as any)?.pagination?.total ?? rows.length;
        const totalPages = (res as any)?.pagination?.totalPages ?? 1;
        const totalPts = (res as any)?.totalPoints ?? rows.reduce((s, r) => s + (r.points || 0), 0);

        setEntries((prev) => (append ? [...prev, ...rows] : rows));
        setTotalCount(total);
        setTotalEarnings(totalPts);
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      } else {
        // Fallback: Query transactions ledger directly
        const sinceDays = RANGES.find((r) => r.key === range)?.days || 365;
        const cutoff = sinceDays > 0 ? Date.now() - sinceDays * 24 * 60 * 60 * 1000 : 0;

        const txRes = await incomeApi.getTransactions({ limit: 300 });
        const allTx = txRes?.data?.data || [];

        const filtered = allTx.filter((tx: any) => {
          if (new Date(tx.createdAt).getTime() < cutoff) return false;
          if (tx.status !== 'completed') return false;

          if (validKey === 'livestream') {
            return (
              (tx.type === 'gift_receive' && tx.sourceType !== 'party') ||
              tx.type === 'call_earning'
            );
          }
          if (validKey === 'party') {
            return tx.type === 'gift_receive' && tx.sourceType === 'party';
          }
          if (validKey === 'commission') {
            return tx.type === 'commission';
          }
          if (validKey === 'transfer') {
            return (
              tx.type === 'transfer_in' ||
              (tx.type === 'transfer' && (!tx.description || !/^Transferred /i.test(tx.description)))
            );
          }
          if (validKey === 'platform_rewards') {
            return [
              'daily_reward',
              'game_win',
              'task_reward',
              'signin_reward',
              'activity_reward',
              'spin_reward',
              'creator_reward',
              'ranking_prize',
              'referral_bonus',
              'platform_rewards',
            ].includes(tx.type);
          }
          return false;
        });

        const mapped: IncomeEntry[] = filtered.map((tx: any) => ({
          _id: tx._id,
          txId: tx.txId || tx._id,
          from: tx.targetId ? {
            _id: tx.targetId._id || tx.targetId,
            nickname: tx.targetId.nickname || 'User',
            avatar: tx.targetId.avatar,
            uid: tx.targetId.uid,
          } : undefined,
          points: tx.amount || 0,
          currency: tx.currency || 'coin',
          type: tx.type,
          sourceType: tx.sourceType,
          giftName: tx.description,
          description: tx.description,
          status: tx.status,
          createdAt: tx.createdAt,
        }));

        setEntries(mapped);
        setTotalCount(mapped.length);
        setTotalEarnings(mapped.reduce((acc, curr) => acc + curr.points, 0));
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load income history:', err);
      if (!append) {
        setEntries([]);
        setTotalCount(0);
        setTotalEarnings(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(1, false);
  }, [validKey, range]);

  const handleCopy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const IconComponent = meta.icon;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* ── Top App Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3 px-4 h-14 max-w-md mx-auto">
          <button
            onClick={() => navigate('/income')}
            aria-label="Back to Income"
            className="p-1.5 -ml-1.5 rounded-full text-slate-700 hover:bg-slate-100 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              {meta.title} History
            </h1>
            <p className="text-[11px] text-slate-500 truncate">Past 1 Year Records</p>
          </div>
          <button
            onClick={() => fetchHistory(1, false)}
            aria-label="Refresh"
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 active:scale-90 transition-transform"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>

        {/* ── Range Selector Pills ─────────────────────────────── */}
        <div className="px-4 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-2 max-w-md mx-auto">
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-md mx-auto p-3 space-y-3">
        {/* ── Hero Summary Card ───────────────────────────────── */}
        <div
          className={`relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-4 shadow-sm bg-gradient-to-br ${meta.gradient}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.badgeBg}`}
                >
                  {meta.badgeText}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Earned ({range === '1y' ? 'Past 1 Year' : RANGES.find((r) => r.key === range)?.label})
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CoinIcon className="w-6 h-6 text-amber-500" />
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                  {totalEarnings.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full ml-1">
                  Coins
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                {totalCount} {totalCount === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section Title ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Transaction Records
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Past 1 Year History</span>
        </div>

        {/* ── Transaction List ─────────────────────────────────── */}
        {loading ? (
          <div className="pt-16 pb-12 flex justify-center">
            <Loading size="lg" />
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <IconComponent className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                No {meta.title} History Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                You do not have any {meta.title.toLowerCase()} recorded in the selected period ({range === '1y' ? 'past 1 year' : range}).
              </p>
            </div>
            <button
              onClick={() => navigate('/income')}
              className="px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 active:scale-95 transition-all shadow-sm"
            >
              Back to Income Overview
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const displayTxId = entry.txId || entry._id;
              const isCopied = copiedId === displayTxId;

              return (
                <div
                  key={entry._id}
                  onClick={() => navigate(`/transactions/${entry._id}`)}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 p-3.5 shadow-sm active:scale-[0.99] transition-all cursor-pointer space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {entry.from?.avatar ? (
                        <Avatar
                          src={entry.from.avatar}
                          alt={entry.from.nickname}
                          size="md"
                          className="shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {entry.from?.nickname
                            ? `${entry.from.nickname}`
                            : entry.giftName || meta.title}
                        </p>
                        {entry.from?.uid && (
                          <p className="text-[11px] text-slate-400">UID: {entry.from.uid}</p>
                        )}
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {entry.description || entry.giftName || 'Earning credit'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1 text-emerald-600 font-extrabold text-sm">
                        <span>+</span>
                        <CoinIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="tabular-nums">
                          {entry.points.toLocaleString()}
                        </span>
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* ── Transaction Footer / Meta ── */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatDate(entry.createdAt)}</span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleCopy(displayTxId, e)}
                        className="flex items-center gap-1 font-mono text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded active:scale-95 transition-all"
                        title="Click to copy Transaction ID"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{displayTxId.slice(0, 10)}...</span>
                          </>
                        )}
                      </button>

                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Load More Button ──────────────────────────────── */}
            {hasMore && (
              <div className="pt-2 text-center">
                <button
                  disabled={loadingMore}
                  onClick={() => fetchHistory(page + 1, true)}
                  className="px-5 py-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold active:scale-95 transition-all shadow-sm disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load Earlier 1-Year History'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
