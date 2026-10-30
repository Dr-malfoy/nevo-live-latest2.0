import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiShieldWarningFill as ShieldAlert,
  PiCaretRightBold as ChevronRight,
  PiShieldCheckFill as ShieldCheck,
  PiSparkleFill as SparkleIcon,
  PiWalletFill as WalletIcon,
  PiArrowsClockwiseBold as RefreshIcon,
} from 'react-icons/pi';
import { IoDiamond } from 'react-icons/io5';
import { usersApi } from '../api';
import { useAuthStore } from '../stores';
import { Loading } from '../components/ui';
import { DiamondIcon } from '../components/ui/CurrencyIcon';
import { countryName, flagEmoji } from '../lib/countries';
import { SellerBadge } from '../components/user/SellerBadge';

const TABS = [
  { key: 'c2c', label: 'Diamond Sellers (c2c)' },
  { key: 'seller_apply', label: '💎 Apply Diamond Seller' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export const TopUp = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [tab, setTab] = useState<TabKey>('c2c');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const { data } = await usersApi.getProfile();
      if (data.success && data.data) {
        updateUser(data.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setTimeout(() => setRefreshing(false), 500);
  };

  const currentDiamonds = user?.diamonds ?? 0;
  const REQUIRED_DIAMONDS = 5000000;
  const isEligible = currentDiamonds >= REQUIRED_DIAMONDS;
  const isDiamondSeller =
    user?.sellerType === 'diamond_seller' ||
    (user as any)?.isDiamondSeller ||
    user?.role === 'diamond_seller';
  const progressPercent = Math.min(100, Math.round((currentDiamonds / REQUIRED_DIAMONDS) * 100));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans select-none">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Top-Up Diamonds</h1>
            <p className="text-[11px] font-medium text-slate-500">Official Merchant & Seller Gateway</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all active:scale-95"
            title="Refresh balance"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="h-8 px-3 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 shrink-0">
            {flagEmoji(user?.country || 'BD')} {countryName(user?.country || 'BD')}
          </span>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* ── Balance Card ─────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 border border-cyan-200/80 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-white border border-cyan-200 flex items-center justify-center shadow-2xs">
                    <DiamondIcon className="w-5 h-5 text-cyan-500" />
                  </div>
                  <p className="text-[28px] leading-tight font-black text-slate-900 tabular-nums">
                    {currentDiamonds.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Current Diamonds Balance</p>
              </div>
              <button
                onClick={() => navigate('/wallet')}
                className="h-8 px-3.5 rounded-full bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-sm border border-slate-200 active:scale-95 transition-all"
              >
                Wallet →
              </button>
            </div>
          </div>

          {/* ── Buy Diamonds (c2c) ────────────────────────────────────── */}
          <div
            onClick={() => navigate('/recharge')}
            className="rounded-3xl bg-white border border-slate-200 p-5 shadow-xs cursor-pointer hover:border-slate-300 active:scale-[0.99] transition-all space-y-3 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                  <WalletIcon className="w-6 h-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Buy Diamonds (c2c)</h3>
                  <p className="text-xs text-slate-500 font-medium">Trade with Certified Diamond Sellers</p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Purchase diamonds safely through our network of verified Diamond Sellers via bKash, Nagad, Rocket, Binance BEP20, and Bybit TRC20.
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/recharge');
              }}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Go to Diamond Sellers Gateway →</span>
            </button>
          </div>

          {/* ── Official Safety Notice ───────────────────────────────── */}
          <div className="rounded-2xl bg-slate-900 px-4 py-3 flex items-start gap-2.5 shadow-sm text-white">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-200 leading-snug">
              <span className="text-amber-400 font-bold">Official Security Notice</span> — Only buy diamonds through verified Diamond Sellers displayed on the platform. All certified sellers hold official badges.
            </p>
          </div>

          {/* ── Tabs / Shortcuts Selector ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-2xl">
            {TABS.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setTab(key);
                    if (key === 'c2c') {
                      navigate('/recharge');
                    } else if (key === 'seller_apply') {
                      navigate('/diamond-seller-apply');
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Shortcut Card 1: Diamond Seller Apply Page (Highlighted) ── */}
          <div
            onClick={() => navigate('/diamond-seller-apply')}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 p-5 text-white border border-cyan-500/40 shadow-lg cursor-pointer hover:border-cyan-400 active:scale-[0.99] transition-all group"
          >
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                    <IoDiamond className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base font-black text-white">Diamond Seller Application</h2>
                      {isDiamondSeller ? (
                        <SellerBadge sellerType="diamond_seller" showLabel={true} />
                      ) : isEligible ? (
                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded-full uppercase">
                          Eligible
                        </span>
                      ) : (
                        <span className="text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.5 rounded-full uppercase">
                          5M 💎 Req.
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-200/80 font-medium">Official Certified Seller Program</p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-cyan-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {isDiamondSeller
                  ? 'You are an approved Diamond Seller. Tap here to view your seller dashboard, accounts, and application details.'
                  : 'Hold 5,000,000+ diamonds? Apply now to receive the official Diamond Seller badge and list your accounts directly on the platform wallet recharge gateway.'}
              </p>

              {/* Progress Meter */}
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
                <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-200 mb-1">
                  <span>Eligibility Requirement</span>
                  <span className="font-extrabold text-white">
                    {currentDiamonds.toLocaleString()} / {REQUIRED_DIAMONDS.toLocaleString()} 💎
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-cyan-300/80 mt-1">
                  <span>{progressPercent}% Complete</span>
                  <span>{isEligible ? 'Target achieved! Ready to apply' : `${(REQUIRED_DIAMONDS - currentDiamonds).toLocaleString()} diamonds remaining`}</span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/diamond-seller-apply');
                  }}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <SparkleIcon className="w-3.5 h-3.5" />
                  <span>{isDiamondSeller ? 'Manage Diamond Seller Status →' : 'Open Diamond Seller Application →'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
