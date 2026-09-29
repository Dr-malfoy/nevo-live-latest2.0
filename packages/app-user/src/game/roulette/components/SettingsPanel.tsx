// Settings panel — sound, music, reduce motion, volume, theme, auto-spin.

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { PiSpeakerHighFill as Volume2, PiSpeakerSlashFill as VolumeX, PiMusicNoteFill as Music, PiMoonFill as Moon, PiSunFill as Sun, PiLightningFill as Zap, PiPulseFill as Activity } from 'react-icons/pi';
import { useSettingsStore } from '../store/settingsStore';
import { useRoulette } from '../context';
import { verifyRound } from '../utils/verify';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const SettingsInner = ({ open, onClose }: SettingsPanelProps) => {
  const {
    sound, music, reduceMotion, volume, theme, autoSpin,
    setSound, setMusic, setReduceMotion, setVolume, setTheme, setAutoSpin,
  } = useSettingsStore();
  const { result } = useRoulette();
  const [verifyMsg, setVerifyMsg] = React.useState<string | null>(null);

  const verify = async () => {
    if (!result?.seed || !result?.hash) {
      setVerifyMsg('No result to verify yet — wait for a round to finish.');
      return;
    }
    const ok = await verifyRound(result.seed, result.hash, result.winningIndex);
    setVerifyMsg(
      ok
        ? `✓ Verified — round ${result.roundNumber} is fair (${result.winningNumber})`
        : '✗ Verification failed — result does not match the committed hash'
    );
  };

  if (!open) return null;

  return (
    <motion.div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div
        className="bg-dark-800 rounded-2xl p-5 max-w-sm w-full border border-dark-700 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="text-dark-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">{sound ? <Volume2 size={16} /> : <VolumeX size={16} />} Sound</span>
            <Toggle on={sound} onToggle={() => setSound(!sound)} />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><Music size={16} /> Music</span>
            <Toggle on={music} onToggle={() => setMusic(!music)} />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><Zap size={16} /> Auto-spin</span>
            <Toggle on={autoSpin} onToggle={() => setAutoSpin(!autoSpin)} />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><Activity size={16} /> Reduce motion</span>
            <Toggle on={reduceMotion} onToggle={() => setReduceMotion(!reduceMotion)} />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm"><Moon size={16} /> Dark mode</span>
            <Toggle on={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
          </label>

          <div>
            <p className="text-xs text-dark-400 mb-1">Volume — {Math.round(volume * 100)}%</p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-yellow-400"
              aria-label="Volume"
            />
          </div>

          <div className="pt-1 border-t border-dark-700">
            <p className="text-xs font-bold text-dark-300 mb-2">Provably fair</p>
            <button
              onClick={verify}
              className="w-full py-2 rounded-lg bg-dark-700 text-xs font-medium hover:bg-dark-600 transition"
            >
              Verify last round
            </button>
            {verifyMsg && <p className={`text-[11px] mt-2 ${verifyMsg.startsWith('✓') ? 'text-emerald-400' : verifyMsg.startsWith('✗') ? 'text-red-400' : 'text-dark-400'}`}>{verifyMsg}</p>}
            {result?.seed && (
              <p className="text-[10px] text-dark-500 mt-1 break-all">Seed: {result.seed.slice(0, 24)}…</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    aria-pressed={on}
    className={`w-11 h-6 rounded-full relative transition-colors ${on ? 'bg-emerald-500' : 'bg-dark-600'}`}
  >
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
  </button>
);

export const SettingsPanel = memo(SettingsInner);
