import { useState } from 'react';
import { PiPhoneFill as Phone } from 'react-icons/pi';
import { securityApi } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, SectionCard } from '../components/common';
import { CoinIcon } from '../components/ui/CurrencyIcon';

/**
 * 1-to-1 call price — requirement #72.
 *
 * The host picks a per-minute price. The floor is 10,000 coins and the server
 * enforces it too (BACKEND-GUIDE.md §4.2) — this screen only saves the host
 * a round-trip.
 */

const MINIMUM = 10_000;
const PRESETS = [10_000, 15_000, 20_000, 50_000];

export const CallPrice = () => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const current = (user as any)?.callPricePerMinute ?? MINIMUM;
  const [price, setPrice] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const value = parseInt(price, 10) || 0;
  const tooLow = value > 0 && value < MINIMUM;
  const canSave = value >= MINIMUM && value !== current && !saving;

  const save = async () => {
    setSaving(true);
    try {
      const res = await optional(securityApi.setCallPrice(value));
      if (res === null) {
        showToast('Call pricing is not connected yet', 'info');
        return;
      }
      if (res.success) {
        updateUser({ ...(user as any), callPricePerMinute: value } as any);
        showToast('Call price updated', 'success');
      } else {
        showToast(res.error || 'Could not save', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <ScreenHeader title="1:1 Call Price" />

      <div className="px-3 pt-3 space-y-3">
        <SectionCard>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-11 h-11 rounded-2xl bg-[#E9F9EE] text-[#22A45D] flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-ink">Per-minute price</p>
              <p className="text-xs text-ink-muted">Minimum {MINIMUM.toLocaleString()} coins</p>
            </div>
          </div>

          <div className="flex items-center h-12 px-4 rounded-xl bg-surface-sunken border border-transparent focus-within:bg-white focus-within:border-accent-500 transition-colors">
            <CoinIcon className="w-5 h-5 text-coin shrink-0" />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="flex-1 min-w-0 ml-2 bg-transparent text-ink focus:outline-none tabular-nums"
            />
            <span className="text-sm text-ink-muted shrink-0">/ min</span>
          </div>

          {tooLow && (
            <p className="text-xs text-role-host mt-2">
              The minimum is {MINIMUM.toLocaleString()} coins per minute.
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setPrice(String(preset))}
                className={`h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
                  value === preset ? 'bg-black text-white' : 'bg-surface-sunken text-ink-soft'
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            className="w-full h-12 mt-5 btn-primary disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </SectionCard>

        <SectionCard title="How billing works">
          <ul className="text-sm text-ink-soft space-y-2 leading-relaxed list-disc list-inside">
            <li>A caller needs at least one minute's worth of coins before the call starts.</li>
            <li>The first minute is charged immediately when you accept.</li>
            <li>
              Time is rounded <strong>up</strong> — a 2 min 30 s call bills 3 minutes.
            </li>
            <li>When the caller runs out of coins the call ends automatically.</li>
          </ul>

          <div className="mt-3 p-3 rounded-xl bg-surface-sunken">
            <p className="text-[13px] text-ink-soft leading-relaxed">
              At <strong>{(value || MINIMUM).toLocaleString()}</strong> coins per minute, a 3-minute
              call earns you{' '}
              <strong className="tabular-nums">{((value || MINIMUM) * 3).toLocaleString()}</strong>{' '}
              coins.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
