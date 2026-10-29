import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PiPhoneCallFill as PhoneCall,
  PiSparkleFill as Sparkles,
  PiCheckBold as Check,
  PiInfoBold as Info,
  PiTrendUpBold as TrendingUp,
  PiChatsCircleFill as ChatIcon,
  PiUserFill as UserIcon,
} from 'react-icons/pi';
import { securityApi } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader } from '../components/common';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';

const PRESETS = [500, 1_000, 2_000, 5_000, 10_000, 20_000];

export const CallPrice = () => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const current = (user as any)?.callPricePerMinute ?? 1_000;
  const [price, setPrice] = useState(String(current));
  const [saving, setSaving] = useState(false);

  const value = parseInt(price, 10) || 0;
  const canSave = value >= 0 && value !== current && !saving;

  // Host receives 70% in Coins (1 Diamond = 1 Coin)
  const hostCutPerMin = Math.floor(value * 0.7);

  const save = async (targetValue?: number) => {
    const valToSave = typeof targetValue === 'number' ? targetValue : value;
    if (valToSave < 0) {
      showToast('Please enter a valid diamond amount', 'info');
      return;
    }
    setSaving(true);
    try {
      const res = await optional(securityApi.setCallPrice(valToSave));
      if (res === null) {
        showToast('Call pricing service is currently offline', 'error');
        return;
      }
      if (res.success) {
        updateUser({ ...(user as any), callPricePerMinute: valToSave } as any);
        showToast(`Call rate updated to ${valToSave.toLocaleString()} Diamonds / min`, 'success');
      } else {
        showToast(res.error || 'Could not save call rate', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update call rate', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12 select-none overflow-x-hidden">
      <ScreenHeader title="1:1 Call Rate Settings" />

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_8px_32px_rgba(6,182,212,0.15)] backdrop-blur-xl"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black tracking-tight text-white">Your Per-Minute Rate</h2>
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400">Callers spend Diamonds to call you (1 Diamond = 1 Coin)</p>
            </div>
          </div>

          {/* Price Input Box */}
          <div className="mt-4">
            <label className="text-[11px] font-bold text-cyan-300/90 uppercase tracking-wider block mb-1.5">
              Charge Per Minute (Diamonds)
            </label>
            <div className="relative flex items-center h-14 px-4 rounded-2xl bg-black/60 border-2 border-cyan-500/40 focus-within:border-cyan-400 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all">
              <DiamondIcon className="w-7 h-7 text-cyan-400 shrink-0 drop-shadow" />
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="1000"
                className="flex-1 min-w-0 ml-3 bg-transparent text-2xl font-black text-white focus:outline-none tabular-nums placeholder-white/20"
              />
              <span className="text-xs font-bold text-cyan-400/90 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-full shrink-0">
                Diamonds / min
              </span>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="mt-3.5">
            <p className="text-[11px] font-medium text-slate-400 mb-2">Quick Presets:</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPrice(String(preset))}
                  className={`h-9 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    value === preset
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30 scale-[1.02]'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  <DiamondIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{preset.toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={() => save()}
            disabled={!canSave}
            className="w-full h-12 mt-5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-cyan-500/25 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="inline-block animate-spin mr-1">⏳</span>
            ) : (
              <Check className="w-5 h-5 stroke-[2]" />
            )}
            <span>{saving ? 'Updating Rate...' : value === current ? 'Current Rate Active' : 'Save New Call Rate'}</span>
          </button>
        </motion.div>

        {/* Live Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-4 bg-slate-900/80 border border-slate-800 shadow-md space-y-3"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Preview For Other Users</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Profile badge preview */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>On Your Profile</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-black shadow-xs">
                <DiamondIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{value.toLocaleString()} Diamonds / min</span>
              </div>
            </div>

            {/* Messenger header preview */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-2">
                <ChatIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>In Messenger Header</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-xs font-bold">
                <DiamondIcon className="w-3 h-3 text-cyan-400" />
                <span>{value.toLocaleString()} / min</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Earnings Calculation Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-4 bg-slate-900/80 border border-slate-800 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Estimated Call Earnings</h3>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Host Share 70% in Coins
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Caller spends Diamonds. You receive 70% in Coins (1 Diamond = 1 Coin). Agency receives 4%-20% tier commission.
          </p>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium block">5-Minute Call</span>
              <p className="text-lg font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <CoinIcon className="w-4 h-4 text-amber-400" />
                <span>{(hostCutPerMin * 5).toLocaleString()}</span>
              </p>
              <span className="text-[10px] text-cyan-400 font-bold">Caller: {(value * 5).toLocaleString()} 💎</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium block">15-Minute Call</span>
              <p className="text-lg font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <CoinIcon className="w-4 h-4 text-amber-400" />
                <span>{(hostCutPerMin * 15).toLocaleString()}</span>
              </p>
              <span className="text-[10px] text-cyan-400 font-bold">Caller: {(value * 15).toLocaleString()} 💎</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium block">30-Minute Call</span>
              <p className="text-lg font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <CoinIcon className="w-4 h-4 text-amber-400" />
                <span>{(hostCutPerMin * 30).toLocaleString()}</span>
              </p>
              <span className="text-[10px] text-cyan-400 font-bold">Caller: {(value * 30).toLocaleString()} 💎</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <span className="text-[11px] text-slate-400 font-medium block">60-Minute Call</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <CoinIcon className="w-4 h-4 text-amber-400" />
                <span>{(hostCutPerMin * 60).toLocaleString()}</span>
              </p>
              <span className="text-[10px] text-cyan-400 font-bold">Caller: {(value * 60).toLocaleString()} 💎</span>
            </div>
          </div>
        </motion.div>

        {/* How It Works Explainer */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl p-4 bg-slate-900/60 border border-slate-800/80 space-y-2.5 text-xs text-slate-400 leading-relaxed"
        >
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>How Call Billing & Commission Work</span>
          </div>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>Callers must have enough <strong className="text-cyan-400">Diamonds</strong> in their balance to start the call.</li>
            <li>Diamonds are deducted per minute automatically while the call is connected.</li>
            <li><strong>1 Diamond = 1 Coin.</strong> Host receives <strong className="text-amber-400">70%</strong> of the total Diamonds in Coins.</li>
            <li>Agency receives <strong className="text-purple-400">4% to 20%</strong> level-wise commission, and Admin receives <strong className="text-pink-400">10% to 26%</strong>.</li>
            <li>If a caller runs out of diamonds during the call, the call automatically disconnects.</li>
          </ul>
        </motion.div>
      </main>
    </div>
  );
};
