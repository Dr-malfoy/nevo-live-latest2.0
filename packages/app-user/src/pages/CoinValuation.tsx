import { useEffect, useState } from 'react';
import {
  PiCaretLeftBold as ArrowLeft,
  PiArrowsClockwiseBold as RefreshIcon,
  PiCoinsFill as CoinBag,
  PiCalculatorBold as CalculatorIcon,
  PiDownloadSimpleBold as ArrowDownToLine,
  PiArrowsLeftRightFill as TransferIcon,
  PiInfoBold as InfoIcon,
  PiCheckCircleFill as CheckCircle,
  PiTrendUpBold as TrendUpIcon,
  PiSparkleFill as SparkleIcon,
} from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';
import client from '../api/client';

const RATE_COINS_PER_BDT = 130;
const BDT_PER_USD = 122; // 1 USD = 122 BDT
const RATE_COINS_PER_USD = RATE_COINS_PER_BDT * BDT_PER_USD; // 15,860 Coins = 1 USD

const QUICK_PRESETS = [
  { coins: RATE_COINS_PER_USD * 1, usd: 1, bdt: 122 },
  { coins: RATE_COINS_PER_USD * 5, usd: 5, bdt: 610 },
  { coins: RATE_COINS_PER_USD * 10, usd: 10, bdt: 1220 },
  { coins: RATE_COINS_PER_USD * 20, usd: 20, bdt: 2440 },
  { coins: RATE_COINS_PER_USD * 50, usd: 50, bdt: 6100 },
  { coins: RATE_COINS_PER_USD * 100, usd: 100, bdt: 12200 },
];

export const CoinValuation = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [refreshing, setRefreshing] = useState(false);
  const userCoins = user?.coins || 0;
  const [calcInput, setCalcInput] = useState<string>(userCoins > 0 ? userCoins.toString() : RATE_COINS_PER_USD.toString());

  const fetchBalance = async () => {
    try {
      setRefreshing(true);
      const res = await client.get('/users/me');
      if (res?.data?.success && res.data.data) {
        updateUser(res.data.data);
      }
    } catch (err) {
      console.error('Failed to refresh user balance', err);
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Update calculator input if user balance was initially 0 and loaded
  useEffect(() => {
    if (user?.coins && user.coins > 0 && calcInput === RATE_COINS_PER_USD.toString()) {
      setCalcInput(user.coins.toString());
    }
  }, [user?.coins]);

  // Total valuation calculation (1 USD = 122 BDT, 130 Coins = 1 BDT -> 15,860 Coins = 1 USD)
  const totalBdtValue = userCoins / RATE_COINS_PER_BDT;
  const totalUsdValue = totalBdtValue / BDT_PER_USD;

  // Calculator calculation
  const parsedCalcCoins = Math.max(0, parseInt(calcInput.replace(/[^0-9]/g, ''), 10) || 0);
  const calculatedBdt = parsedCalcCoins / RATE_COINS_PER_BDT;
  const calculatedUsd = calculatedBdt / BDT_PER_USD;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* ── Sticky Top Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Coin Valuation</h1>
          </div>
        </div>

        <button
          onClick={fetchBalance}
          disabled={refreshing}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95"
          title="Refresh balance"
        >
          <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-5">
        {/* ── Main Valuation Hero Card ───────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white p-6 shadow-xl border border-slate-800">
          {/* Decorative glowing backdrops */}
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-44 h-44 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Top badges */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <CoinIcon className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-300">My Coins Balance</span>
                <p className="text-lg font-black text-amber-400 tabular-nums leading-tight">
                  {userCoins.toLocaleString()} <span className="text-xs font-semibold text-amber-200/80">Coins</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <SparkleIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>$1 USD = ৳122 BDT</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 my-4" />

          {/* Total Calculated Valuation Section */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Calculated Cash Value
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-400">USD</span>
            </div>
            <p className="text-xs text-slate-300 font-medium pt-1">
              ≈ <span className="font-bold text-white">৳{totalBdtValue.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT</span> (1 USD = 122 BDT)
            </p>
          </div>

          {/* Conversion Formula Tag */}
          <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <TrendUpIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Conversion Rate</span>
            </div>
            <div className="font-mono font-bold text-emerald-300">
              {RATE_COINS_PER_USD.toLocaleString()} Coins = $1.00 USD (৳122 BDT)
            </div>
          </div>
        </div>

        {/* ── Quick Action Buttons ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/withdraw')}
            className="py-3.5 px-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Withdraw Cash</span>
          </button>

          <button
            onClick={() => navigate('/transfer')}
            className="py-3.5 px-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <DiamondIcon className="w-4 h-4 text-cyan-500" />
            <span>Transfer Diamonds</span>
          </button>
        </div>

        {/* ── Interactive Valuation Calculator ────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <CalculatorIcon className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Valuation Calculator</h2>
            </div>
            <button
              onClick={() => setCalcInput(userCoins.toString())}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition-colors"
            >
              My Balance
            </button>
          </div>

          {/* Calculator Input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Enter Amount of Coins
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={calcInput}
                onChange={(e) => setCalcInput(e.target.value)}
                placeholder="Enter coin amount"
                className="w-full px-4 py-3 pr-20 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all tabular-nums"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-slate-400 pointer-events-none">
                <CoinIcon className="w-4 h-4 text-amber-500" />
                <span>Coins</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Quick Select Amounts</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                RATE_COINS_PER_USD,
                RATE_COINS_PER_USD * 5,
                RATE_COINS_PER_USD * 10,
                RATE_COINS_PER_USD * 20,
                RATE_COINS_PER_USD * 50,
                RATE_COINS_PER_USD * 100,
              ].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCalcInput(amt.toString())}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    parsedCalcCoins === amt
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ${(amt / RATE_COINS_PER_USD).toFixed(0)} ({amt.toLocaleString()})
                </button>
              ))}
            </div>
          </div>

          {/* Result Highlight Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-amber-50 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                Calculated Value
              </p>
              <p className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                ${calculatedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-bold text-emerald-600">USD</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                ≈ ৳{calculatedBdt.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full inline-block mb-1">
                USD Value
              </span>
              <p className="text-xs font-semibold text-slate-500">
                {parsedCalcCoins.toLocaleString()} ÷ {RATE_COINS_PER_USD.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ── Standard Rates Reference Table ─────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Exchange Valuation Milestones</h2>
            <span className="text-xs font-bold text-emerald-600">$1 USD = ৳122 BDT</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <div
                key={preset.coins}
                onClick={() => setCalcInput(preset.coins.toString())}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800 tabular-nums">
                    {preset.coins.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-700 tabular-nums block">
                    ${preset.usd.toLocaleString()} USD
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums block">
                    ৳{preset.bdt.toLocaleString()} BDT
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Information Card ───────────────────────────────────────── */}
        <div className="bg-slate-100/80 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <InfoIcon className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">About Coin Valuation</p>
            <p>
              Your coins represent earned rewards from live gifts, game activities, and agency commissions.
              Valuation is calculated in Dollars ($ USD) based on the exchange rate of <strong className="text-slate-900">1 USD = 122 BDT</strong> ({RATE_COINS_PER_USD.toLocaleString()} Coins = $1.00 USD).
            </p>
            <p>
              You can withdraw your funds in USD (via USDT) or in BDT (via bKash, Nagad, Rocket) through the Withdraw page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinValuation;
