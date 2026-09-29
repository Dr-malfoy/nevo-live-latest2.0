import { useEffect, useState } from 'react';
import { PiGiftFill as Gift } from 'react-icons/pi';
import { Card, Button } from '../ui';
import { CoinIcon } from '../ui/CurrencyIcon';
import { rewardApi } from '../../api/reward.api';
import { useAuthStore } from '../../stores';
import { useUIStore } from '../../stores';
import type { RewardStatus, RewardTier } from '../../types';

const formatNumber = (n: number) => n.toLocaleString('en-US');

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const DailyRewardCard = () => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const load = () => {
    setLoading(true);
    rewardApi
      .getStatus()
      .then((res) => {
        if (res.data.success && res.data.data) setStatus(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleClaim = async () => {
    if (!status?.claimable || claiming) return;
    setClaiming(true);
    try {
      const { data } = await rewardApi.claim();
      if (data.success && data.data) {
        const { balance } = data.data;
        if (balance) updateUser({ coins: balance.coins, diamonds: balance.diamonds });
        showToast(`Reward claimed! +${formatNumber(data.data.rewardCoins)} coins`, 'success');
        load();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Claim failed', 'error');
      load();
    } finally {
      setClaiming(false);
    }
  };

  // Progress toward the next tier
  const next: RewardTier | null = status?.nextTier || null;
  const count = status?.count || 0;
  const liveMinutes = status?.liveMinutes || 0;
  const countPct = next ? Math.min(100, (count / next.count) * 100) : 100;
  const livePct = next ? Math.min(100, (liveMinutes / (next.requiredHours * 60)) * 100) : 100;

  return (
    <Card className="p-4 bg-gradient-to-br from-dark-800 to-dark-900 border-accent-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-accent-500" />
          </div>
          <div>
            <p className="font-bold text-sm">Daily Count Reward</p>
            <p className="text-xs text-ink-muted">7-day count · claim daily</p>
          </div>
        </div>
        {status?.claimed && (
          <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400 font-medium">Claimed</span>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-accent-500 border-t-transparent rounded-full" />
        </div>
      ) : !status ? (
        <p className="text-ink-muted text-sm text-center py-4">Reward progress unavailable</p>
      ) : (
        <div className="space-y-4">
          {/* Count */}
          <div>
            <div className="flex justify-between text-xs text-ink-muted mb-1">
              <span>Count (coins earned this cycle)</span>
              <span className="text-ink font-medium">{formatNumber(count)}</span>
            </div>
            <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400" style={{ width: `${countPct}%` }} />
            </div>
            {next && (
              <p className="text-[11px] text-ink-faint mt-1">
                {formatNumber(next.count - count > 0 ? next.count - count : 0)} coins to next tier
              </p>
            )}
          </div>

          {/* Live time */}
          <div>
            <div className="flex justify-between text-xs text-ink-muted mb-1">
              <span>Live time today</span>
              <span className="text-ink font-medium">{formatMinutes(liveMinutes)}</span>
            </div>
            <div className="h-2 rounded-full bg-dark-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: `${livePct}%` }} />
            </div>
            {next && (
              <p className="text-[11px] text-ink-faint mt-1">
                {next.requiredHours}h live required · {formatMinutes(next.requiredHours * 60 - liveMinutes)} left
              </p>
            )}
          </div>

          {/* Next tier info */}
          {next ? (
            <div className="flex items-center justify-between bg-surface-sunken rounded-lg p-3">
              <div className="text-xs text-ink-muted">
                <p>Next reward</p>
                <p className="text-ink font-semibold text-sm">
                  {formatNumber(next.count)} count · {next.requiredHours}h live
                </p>
              </div>
              <div className="flex items-center gap-1 text-yellow-400 font-bold">
                <CoinIcon className="w-4 h-4" />
                {formatNumber(next.rewardCoins)}
              </div>
            </div>
          ) : (
            <div className="bg-surface-sunken rounded-lg p-3 text-sm text-center text-yellow-400 font-medium">
              All tiers reached! 🎉
            </div>
          )}

          {/* Claim */}
          {!status.claimed && (
            <Button
              fullWidth
              loading={claiming}
              disabled={!status.claimable}
              onClick={handleClaim}
            >
              {status.claimable
                ? `Claim ${status.qualifiedTier ? formatNumber(status.qualifiedTier.rewardCoins) : ''} coins`
                : 'Go live & earn more to claim'}
            </Button>
          )}
          {status.claimed && status.claimedTier && (
            <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-3 text-center">
              <p className="text-sm text-green-400 font-medium">
                Claimed {formatNumber(status.claimedTier.rewardCoins)} coins today
              </p>
              <p className="text-xs text-ink-muted mt-0.5">Come back tomorrow to claim again</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
