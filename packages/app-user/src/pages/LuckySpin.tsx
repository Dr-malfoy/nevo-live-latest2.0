import { useEffect, useMemo, useRef, useState } from 'react';
import { gamesApi, type LuckySpinState, type SpinSlice } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, CountdownPill, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Lucky Spin — requirement #66.
 *
 * **The server decides the slice.** `POST /lucky-spin/spin` returns the winning
 * index and credits it in the same transaction; this screen only animates to
 * that index. If the client picked the slice the wheel would be decorative and
 * trivially cheatable, so the animation deliberately follows the response
 * rather than leading it.
 */

const FALLBACK_SLICES: SpinSlice[] = [
  { index: 0, amount: 1500, currency: 'ticket' },
  { index: 1, amount: 2000, currency: 'diamond' },
  { index: 2, amount: 3000, currency: 'ticket' },
  { index: 3, amount: 5000, currency: 'ticket' },
  { index: 4, amount: 8000, currency: 'ticket' },
  { index: 5, amount: 10000, currency: 'ticket' },
  { index: 6, amount: 500, currency: 'ticket' },
  { index: 7, amount: 1000, currency: 'ticket' },
];

const CURRENCY_EMOJI: Record<string, string> = {
  coin: '🪙',
  diamond: '💎',
  ticket: '🎟️',
};

export const LuckySpin = () => {
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [state, setState] = useState<LuckySpinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ amount: number; currency: string } | null>(null);
  const spinLock = useRef(false);

  useEffect(() => {
    let cancelled = false;

    optional(gamesApi.getLuckySpin())
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data?.slices?.length) {
          setState(res.data);
          setLive(true);
        } else {
          setState({ slices: FALLBACK_SLICES, freeSpinAvailable: false });
          setLive(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ slices: FALLBACK_SLICES, freeSpinAvailable: false });
          setLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const slices = state?.slices ?? FALLBACK_SLICES;
  const sliceAngle = 360 / slices.length;

  const spin = async () => {
    if (spinLock.current || spinning) return;
    spinLock.current = true;
    setSpinning(true);
    setResult(null);

    try {
      const res = await optional(gamesApi.spin(false));
      if (res === null) {
        showToast('Lucky Spin is not connected yet', 'info');
        return;
      }
      if (!res.success || !res.data) {
        showToast(res.error || 'Could not spin', 'error');
        return;
      }

      const { sliceIndex, reward } = res.data;

      // Five full turns, then land on the slice the server chose.
      const target = 360 * 5 + (360 - sliceIndex * sliceAngle - sliceAngle / 2);
      setRotation((prev) => prev + target);

      // Reveal after the CSS transition finishes.
      setTimeout(() => {
        setResult(reward);
        showToast(`You won ${reward.amount.toLocaleString()} ${reward.currency}`, 'success');
        setState((prev) => (prev ? { ...prev, freeSpinAvailable: false } : prev));
      }, 4200);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not spin', 'error');
    } finally {
      setTimeout(() => {
        setSpinning(false);
        spinLock.current = false;
      }, 4300);
    }
  };

  const wheelBackground = useMemo(
    () =>
      `conic-gradient(${slices
        .map((_, i) => {
          const color = i % 2 === 0 ? '#3B5BFF' : '#A5B4FC';
          return `${color} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`;
        })
        .join(', ')})`,
    [slices, sliceAngle]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1A5A] to-[#1A3A9A] pb-10">
      <ScreenHeader title="Lucky Spin" variant="media" />

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : (
        <>
          {/* Balances (#66.2) */}
          <div className="flex items-center gap-2 px-4">
            {[
              ['🪙', user?.coins ?? 0],
              ['💎', user?.diamonds ?? 0],
              ['🎟️', (user as any)?.tickets ?? 0],
            ].map(([icon, value]) => (
              <span
                key={icon as string}
                className="h-8 px-3 rounded-full bg-white/15 text-white text-sm font-semibold
                  flex items-center gap-1.5 tabular-nums"
              >
                {icon} {compactNumber(value as number)}
              </span>
            ))}
          </div>

          <p className="text-center text-white font-bold mt-6 px-8">Spin to get your daily reward!</p>

          {/* Wheel */}
          <div className="relative w-[300px] h-[300px] mx-auto mt-6">
            {/* Pointer */}
            <span
              className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 w-0 h-0
                border-l-[10px] border-r-[10px] border-t-[18px]
                border-l-transparent border-r-transparent border-t-[#FFD700]"
              aria-hidden="true"
            />

            <div
              className="absolute inset-0 rounded-full border-[6px] border-[#D2691E] shadow-2xl"
              style={{
                background: wheelBackground,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              }}
            >
              {slices.map((slice, i) => {
                // Sit the label at the slice centroid, then undo the rotation so
                // it reads upright — rotating the label with the slice leaves the
                // left half of the wheel upside down.
                const angle = i * sliceAngle + sliceAngle / 2;
                return (
                  <div
                    key={slice.index}
                    className="absolute left-1/2 top-1/2 w-0 h-0 flex items-center justify-center"
                    style={{
                      transform: `rotate(${angle}deg) translateY(-92px) rotate(${-angle}deg)`,
                    }}
                  >
                    <span className="block text-white text-[13px] font-bold whitespace-nowrap drop-shadow">
                      {compactNumber(slice.amount)} {CURRENCY_EMOJI[slice.currency] ?? ''}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Centre button */}
            <button
              onClick={spin}
              disabled={spinning || !state?.freeSpinAvailable}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                w-[96px] h-[96px] rounded-full bg-gradient-to-br from-[#D946EF] to-[#FF1493]
                text-white text-lg font-bold border-4 border-white/80 shadow-xl
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {spinning ? '…' : state?.freeSpinAvailable ? 'Free' : 'Used'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mx-6 mt-6 rounded-card bg-white/15 backdrop-blur px-4 py-3 text-center">
              <p className="text-white font-bold">
                You won {result.amount.toLocaleString()}{' '}
                {CURRENCY_EMOJI[result.currency] ?? result.currency}
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 mt-6 px-6">
            {!state?.freeSpinAvailable && state?.nextFreeSpinAt && (
              <CountdownPill to={state.nextFreeSpinAt} tone="light" />
            )}
            <p className="text-center text-xs text-white/60">All users can spin once daily.</p>
          </div>

          {!live && <PendingApiNotice section="§4.13" what="The Lucky Spin wheel" />}
        </>
      )}
    </div>
  );
};
