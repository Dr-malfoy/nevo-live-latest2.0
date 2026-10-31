import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { gamesApi, type LuckySpinState, type SpinSlice } from '../api/economy.api';
import { useAuthStore, useUIStore } from '../stores';
import { CountdownPill } from '../components/common';
import { Loading } from '../components/ui';

// 10 Diamond slices matching backend configuration (5, 10, 15, 20, 25, 45, 75, 100, 250, 500 💎)
const FALLBACK_SLICES: SpinSlice[] = [
  { index: 0, amount: 5, currency: 'diamond' },
  { index: 1, amount: 10, currency: 'diamond' },
  { index: 2, amount: 15, currency: 'diamond' },
  { index: 3, amount: 20, currency: 'diamond' },
  { index: 4, amount: 25, currency: 'diamond' },
  { index: 5, amount: 45, currency: 'diamond' },
  { index: 6, amount: 75, currency: 'diamond' },
  { index: 7, amount: 100, currency: 'diamond' },
  { index: 8, amount: 250, currency: 'diamond' },
  { index: 9, amount: 500, currency: 'diamond' },
];

const SLICE_COLORS = [
  '#0f172a', // 5 💎
  '#0d9488', // 10 💎
  '#1e293b', // 15 💎
  '#0284c7', // 20 💎
  '#312e81', // 25 💎
  '#059669', // 45 💎
  '#4f46e5', // 75 💎
  '#7c3aed', // 100 💎
  '#b45309', // 250 💎 (Major Prize)
  '#d97706', // 500 💎 (JACKPOT)
];

export const LuckySpin = () => {
  const navigate = useNavigate();
  const { user, updateUser, fetchProfile } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [state, setState] = useState<LuckySpinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ amount: number; currency: string } | null>(null);
  const [isRewardCredited, setIsRewardCredited] = useState(false);
  const [deltaBadge, setDeltaBadge] = useState<{ text: string; type: 'deduct' | 'win' | 'free' } | null>(null);
  const [lastSpinDetails, setLastSpinDetails] = useState<{ cost: number; won: number; net: number } | null>(null);
  const spinLock = useRef(false);
  const pendingCreditTimeoutRef = useRef<any>(null);
  const pendingCreditFnRef = useRef<(() => void) | null>(null);
  const badgeTimeoutRef = useRef<any>(null);

  const showDeltaBadge = useCallback((badge: { text: string; type: 'deduct' | 'win' | 'free' } | null, durationMs = 4500) => {
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current);
      badgeTimeoutRef.current = null;
    }
    setDeltaBadge(badge);
    if (badge && durationMs > 0) {
      badgeTimeoutRef.current = setTimeout(() => {
        setDeltaBadge(null);
      }, durationMs);
    }
  }, []);

  const applyPendingCredit = useCallback(() => {
    if (pendingCreditTimeoutRef.current) {
      clearTimeout(pendingCreditTimeoutRef.current);
      pendingCreditTimeoutRef.current = null;
    }
    if (pendingCreditFnRef.current) {
      pendingCreditFnRef.current();
      pendingCreditFnRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      applyPendingCredit();
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
    };
  }, [applyPendingCredit]);

  useEffect(() => {
    let cancelled = false;

    gamesApi
      .getLuckySpin()
      .then((res: any) => {
        if (cancelled) return;
        const data = res?.data?.data || res?.data;
        if (data?.slices?.length) {
          setState(data);
        } else {
          setState({ slices: FALLBACK_SLICES, freeSpinAvailable: true, extraSpinCostDiamonds: 10 });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ slices: FALLBACK_SLICES, freeSpinAvailable: true, extraSpinCostDiamonds: 10 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const slices = state?.slices?.length ? state.slices : FALLBACK_SLICES;
  const sliceAngle = 360 / slices.length;
  const isFree = Boolean(state?.freeSpinAvailable);
  const spinCost = state?.extraSpinCostDiamonds ?? 10;
  const diamonds = Math.floor(user?.diamonds ?? 0);

  const handleSpin = async () => {
    if (spinLock.current || spinning) return;

    if (!isFree && diamonds < spinCost) {
      showToast(`You need at least ${spinCost} 💎 Diamonds to spin!`, 'error');
      return;
    }

    spinLock.current = true;
    setSpinning(true);
    setResult(null);
    setIsRewardCredited(false);

    const cost = isFree ? 0 : spinCost;

    // Immediately deduct 10 diamonds optimistically on screen so deduction is 100% visible
    if (cost > 0) {
      updateUser({ diamonds: Math.max(0, diamonds - cost) });
      showDeltaBadge({ text: `-${cost} 💎`, type: 'deduct' }, 4000);
    } else {
      showDeltaBadge({ text: '🎁 Free Spin', type: 'free' }, 4000);
    }

    try {
      // paid = true when free spin has already been used
      const res: any = await gamesApi.spin(!isFree);
      const data = res?.data?.data || res?.data;

      if (!data || typeof data.sliceIndex !== 'number') {
        const errorMsg = res?.data?.error || res?.error || 'Could not execute spin';
        showToast(errorMsg, 'error');
        // Rollback optimistic deduction on error
        if (cost > 0) {
          updateUser({ diamonds });
        }
        showDeltaBadge(null);
        setSpinning(false);
        spinLock.current = false;
        return;
      }

      const { sliceIndex, reward, balances } = data;

      // Calculate forward rotation so pointer lands exactly on sliceIndex every spin
      const desiredModulo = (360 - (sliceIndex * sliceAngle + sliceAngle / 2)) % 360;
      setRotation((prev) => {
        const currentModulo = ((prev % 360) + 360) % 360;
        let delta = desiredModulo - currentModulo;
        if (delta <= 0) delta += 360;
        return prev + 360 * 5 + delta;
      });

      // Reveal winner pop-up when spin animation finishes (4.1s)
      setTimeout(() => {
        setResult(reward);
        setIsRewardCredited(false);

        const net = reward.amount - cost;
        setLastSpinDetails({ cost, won: reward.amount, net });

        setState((prev) => (prev ? {
          ...prev,
          freeSpinAvailable: data.freeSpinAvailable ?? false,
          nextFreeSpinAt: data.nextFreeSpinAt ?? prev.nextFreeSpinAt,
        } : prev));

        // Automatically add won diamonds to account shortly after the win modal appears (600ms)
        const creditAction = () => {
          const finalDiamonds = balances?.diamonds ?? (Math.max(0, diamonds - cost) + reward.amount);
          updateUser({ diamonds: finalDiamonds });
          setIsRewardCredited(true);
          showDeltaBadge({ text: `+${reward.amount} 💎`, type: 'win' }, 5000);
          fetchProfile().catch(() => {});
          showToast(`🎉 You won ${reward.amount.toLocaleString()} 💎 Diamonds!`, 'success');
        };

        pendingCreditFnRef.current = creditAction;
        pendingCreditTimeoutRef.current = setTimeout(() => {
          if (pendingCreditFnRef.current) {
            pendingCreditFnRef.current();
            pendingCreditFnRef.current = null;
          }
        }, 600);
      }, 4100);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not execute spin';
      showToast(msg, 'error');
      if (cost > 0) {
        updateUser({ diamonds });
      }
      showDeltaBadge(null);
    } finally {
      setTimeout(() => {
        setSpinning(false);
        spinLock.current = false;
      }, 4300);
    }
  };

  const wheelBackground = useMemo(() => {
    const segments = slices.map((_, i) => {
      const color = SLICE_COLORS[i % SLICE_COLORS.length];
      return `${color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [slices, sliceAngle]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white select-none flex flex-col justify-between pb-8">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 z-30 bg-[#0b101c]/95 backdrop-blur-xl shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#141b2a] hover:bg-[#1d273c] border border-white/10 flex items-center justify-center transition active:scale-95 shadow shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center min-w-0 mx-2 text-center">
          <h1 className="text-base font-black tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent truncate">
            LUCKY SPIN 🎡
          </h1>
          <span className="text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase truncate">
            Win Up To 500 Diamonds
          </span>
        </div>

        {/* Live Diamond Balance Display */}
        <div className="flex items-center gap-1.5 shrink-0">
          {deltaBadge && (
            <span
              key={deltaBadge.text}
              className={`inline-flex items-center justify-center gap-1 whitespace-nowrap leading-none px-2.5 py-1 rounded-full text-xs font-black shadow-md border shrink-0 ${
                deltaBadge.type === 'deduct'
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-300'
                  : deltaBadge.type === 'win'
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 animate-pulse ring-1 ring-emerald-400/40'
                  : 'bg-cyan-950/90 border-cyan-500/80 text-cyan-300'
              }`}
            >
              <span className="whitespace-nowrap tracking-tight">{deltaBadge.text}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-[#121927] border border-cyan-500/40 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(42,182,228,0.25)] shrink-0">
            <span className="text-sm">💎</span>
            <span className="text-xs sm:text-sm font-black text-cyan-300 tracking-wide">
              {diamonds.toLocaleString()}
            </span>
            <button
              onClick={() => navigate('/recharge')}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-black flex items-center justify-center font-black text-xs transition shadow active:scale-95"
              title="Recharge Diamonds"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Loading className="py-32" size="lg" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-between p-4 max-w-md mx-auto w-full space-y-6">
          {/* Headline & Free Spin Banner */}
          <div className="text-center space-y-1.5 pt-2">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Spin & Win Up to{' '}
              <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent drop-shadow">
                500 💎
              </span>
            </h2>
            <div className="flex items-center justify-center gap-2">
              {isFree ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
                  🎁 Daily Free Spin Available!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131b2e] border border-amber-500/40 text-amber-300 text-xs font-black shadow">
                  ⚡ Extra Spin: {spinCost} Diamonds
                </span>
              )}
            </div>
          </div>

          {/* The Lucky Wheel */}
          <div className="relative w-[320px] h-[320px] sm:w-[340px] sm:h-[340px] my-auto">
            {/* Top Pointer (Golden Arrow with drop shadow) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
              <div className="w-6 h-7 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 [clip-path:polygon(50%_100%,0%_0%,100%_0%)]" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 -mt-5.5 border border-amber-200 shadow-inner" />
            </div>

            {/* Outer Golden Casino Frame with Light Pegs */}
            <div className="absolute inset-0 rounded-full border-[8px] border-[#c89b3c] shadow-[0_0_40px_rgba(200,155,60,0.4),inset_0_0_20px_rgba(0,0,0,0.8)] bg-[#070b14]" />

            {/* Rotating Wheel Disk */}
            <div
              className="absolute inset-[6px] rounded-full overflow-hidden"
              style={{
                background: wheelBackground,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              }}
            >
              {slices.map((slice, i) => {
                const angle = i * sliceAngle + sliceAngle / 2;
                const isJackpot = slice.amount === 500;
                const isMega = slice.amount === 250;

                return (
                  <div
                    key={slice.index}
                    className="absolute left-1/2 top-1/2 w-0 h-0 flex items-center justify-center"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-105px) rotate(${-angle}deg)`,
                    }}
                  >
                    <div className="flex flex-col items-center leading-tight">
                      {isJackpot && (
                        <span className="text-[9px] font-black text-amber-300 bg-black/80 px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow mb-0.5">
                          👑 JACKPOT
                        </span>
                      )}
                      {isMega && (
                        <span className="text-[9px] font-black text-yellow-300 bg-red-950/80 px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow mb-0.5">
                          🔥 MEGA
                        </span>
                      )}
                      <span
                        className={`text-sm sm:text-base font-black whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] flex items-center gap-0.5 ${
                          isJackpot ? 'text-amber-300 font-extrabold scale-110' : isMega ? 'text-yellow-200 scale-105' : 'text-white'
                        }`}
                      >
                        {slice.amount.toLocaleString()} 💎
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Centre Spin Button */}
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[96px] h-[96px] rounded-full border-4 shadow-2xl flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed ${
                isFree
                  ? 'bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 border-emerald-200 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)] animate-pulse'
                  : 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 border-amber-200 text-black shadow-[0_0_30px_rgba(245,197,24,0.6)]'
              }`}
            >
              {spinning ? (
                <div className="flex flex-col items-center">
                  <span className="text-xl animate-spin">🎡</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">Spinning</span>
                </div>
              ) : isFree ? (
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100">FREE</span>
                  <span className="text-base font-black tracking-tight">SPIN</span>
                </div>
              ) : (
                <div className="flex flex-col items-center leading-none">
                  <span className="text-base font-black tracking-tight">SPIN</span>
                  <span className="text-[11px] font-black text-black/85 flex items-center gap-0.5 pt-0.5">
                    10 💎
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Bottom Controls / Daily Status */}
          <div className="w-full space-y-3 pt-4">
            {/* Main Action Button */}
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 disabled:opacity-50 ${
                isFree
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black shadow-[0_0_25px_rgba(245,197,24,0.4)]'
              }`}
            >
              {spinning ? (
                <span>Spinning the Wheel... 🎡</span>
              ) : isFree ? (
                <span>🎁 CLAIM DAILY FREE SPIN (0 💎)</span>
              ) : (
                <span>💎 SPIN FOR {spinCost} DIAMONDS</span>
              )}
            </button>

            {/* Live Last Spin Transaction Summary Tracker */}
            {lastSpinDetails && (
              <div className="rounded-2xl bg-[#0e1626]/90 border border-cyan-500/40 p-3 shadow-md flex items-center justify-between text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Spin Cost</span>
                  <span className={`font-black ${lastSpinDetails.cost === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lastSpinDetails.cost === 0 ? '🎁 Free' : `-${lastSpinDetails.cost} 💎`}
                  </span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Prize Won</span>
                  <span className="font-black text-emerald-400">+{lastSpinDetails.won} 💎</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase">Net Result</span>
                  <span className={`font-black ${lastSpinDetails.net >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                    {lastSpinDetails.net >= 0 ? `+${lastSpinDetails.net}` : lastSpinDetails.net} 💎
                  </span>
                </div>
              </div>
            )}

            {/* Next Free Spin Countdown */}
            {!isFree && state?.nextFreeSpinAt && (
              <div className="flex flex-col items-center gap-1">
                <span className="text-[11px] text-zinc-400 font-bold">Next Daily Free Spin in:</span>
                <CountdownPill to={state.nextFreeSpinAt} tone="light" />
              </div>
            )}

            {/* Lucky Spin Rules & Odds Banner */}
            <div className="rounded-2xl bg-[#0e1626]/80 border border-white/10 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-300 font-black border-b border-white/10 pb-1.5">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <span>ℹ️</span> Spin Rules & Odds
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">100% Fair RNG</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="text-emerald-400">🎁</span>
                  <span>1 Free Spin / Day</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="text-cyan-400">💎</span>
                  <span>Cost: 10 💎 / Spin</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="text-amber-400">🏆</span>
                  <span>Win up to 500 💎</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="text-purple-400">🎯</span>
                  <span>500 💎 Chance: 10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Winner Pop-Up Modal */}
      {result && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0c121d] border-2 border-amber-400/80 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-[0_0_60px_rgba(245,197,24,0.45)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

            <div className="text-5xl animate-bounce">
              {result.amount >= 250 ? '👑🎉' : '💎✨'}
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-amber-300">
                {result.amount >= 500
                  ? 'MEGA JACKPOT WINNER!'
                  : result.amount >= 250
                  ? 'MAJOR PRIZE WINNER!'
                  : 'CONGRATULATIONS!'}
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                You won diamonds from the Lucky Spin wheel!
              </p>
            </div>

            {/* Won Diamond Amount & Auto-Credit Status */}
            <div className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/25 to-amber-500/15 border border-amber-400/50 shadow-inner flex flex-col items-center justify-center">
              <span className="text-[11px] uppercase tracking-widest text-zinc-400 font-extrabold">You Won</span>
              <span className="text-3xl sm:text-4xl font-black text-amber-300 drop-shadow-[0_2px_12px_rgba(252,211,77,0.5)] flex items-center gap-1.5 pt-0.5">
                +{result.amount.toLocaleString()} 💎
              </span>
              <div className="mt-2 text-xs font-bold transition-all duration-300">
                {isRewardCredited ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse">
                    ✅ Automatically added to your balance
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 animate-pulse">
                    ⏳ Auto-adding to your balance...
                  </span>
                )}
              </div>
            </div>

            {/* Live Breakdown Box */}
            <div className="bg-[#121927] border border-white/10 rounded-2xl p-3 space-y-1.5 text-xs text-left">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Spin Cost:</span>
                <span className="font-black text-rose-400">
                  {lastSpinDetails?.cost === 0 ? '🎁 Free (0 💎)' : `-${lastSpinDetails?.cost ?? 0} 💎`}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Prize Won:</span>
                <span className="font-black text-emerald-400">+{result.amount.toLocaleString()} 💎</span>
              </div>
              <div className="border-t border-white/10 pt-1 flex justify-between items-center text-white font-black">
                <span>Net Gain:</span>
                <span className="text-amber-300">
                  {((result.amount - (lastSpinDetails?.cost ?? 0)) >= 0 ? '+' : '')}
                  {(result.amount - (lastSpinDetails?.cost ?? 0)).toLocaleString()} 💎
                </span>
              </div>
              <div className="border-t border-white/10 pt-1 flex justify-between items-center text-zinc-300 font-black">
                <span>Total Balance:</span>
                <span className="text-cyan-300">💎 {diamonds.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  applyPendingCredit();
                  setResult(null);
                }}
                className="flex-1 py-3 rounded-xl bg-[#141d2e] hover:bg-[#1d293f] text-zinc-300 hover:text-white font-black text-xs border border-white/10 transition active:scale-95"
              >
                Collect
              </button>
              <button
                onClick={() => {
                  applyPendingCredit();
                  setResult(null);
                  handleSpin();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-xs shadow-md transition active:scale-95"
              >
                Spin Again (10 💎)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LuckySpin;
