import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiMagicWandFill as WandIcon, PiSparkleFill as Sparkle, PiArrowsLeftRightBold as FlipIcon, PiWaveformBold as NoiseIcon, PiArrowCounterClockwiseBold as ResetIcon } from 'react-icons/pi';

interface BeautyModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  smoothness: number;
  onSmoothnessChange: (val: number) => void;
  whitening: number;
  onWhiteningChange: (val: number) => void;
  isMirrored?: boolean;
  mirrorOn?: boolean;
  onToggleMirror?: () => void;
  noiseReduction?: boolean;
  noiseReductionOn?: boolean;
  onToggleNoiseReduction?: () => void;
  onReset?: () => void;
}

export const BeautyModal: React.FC<BeautyModalProps> = ({
  open,
  isOpen,
  onClose,
  smoothness,
  onSmoothnessChange,
  whitening,
  onWhiteningChange,
  isMirrored,
  mirrorOn,
  onToggleMirror,
  noiseReduction,
  noiseReductionOn,
  onToggleNoiseReduction,
  onReset,
}) => {
  const isModalOpen = Boolean(isOpen ?? open);
  const mirrored = Boolean(mirrorOn ?? isMirrored);
  const noiseActive = Boolean(noiseReductionOn ?? noiseReduction);

  if (!isModalOpen) return null;

  const handleReset = () => {
    onSmoothnessChange(0);
    onWhiteningChange(0);
    onReset?.();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-none">
        {/* Transparent Backdrop (NO blur) so the host can clearly see their live face and effects in real-time */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/20 pointer-events-auto"
        />

        {/* Modal Bottom Sheet — compact bottom controller */}
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="pointer-events-auto relative w-full max-w-lg bg-[#141224]/95 border-t border-pink-500/30 rounded-t-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.7)] p-5 text-white z-10 flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]">
                <WandIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Beauty & Video Effects</h3>
                <p className="text-[11px] text-white/50">Real-time facial skin smoothing and whitening</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                title="Reset to default"
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs text-white/70 hover:text-white flex items-center gap-1"
              >
                <ResetIcon className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sliders Area */}
          <div className="space-y-5">
            {/* Smooth Filter Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-white">
                  <Sparkle className="w-4 h-4 text-pink-400" />
                  Smooth Skin Filter
                </span>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold tabular-nums">
                  {smoothness}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={smoothness}
                onChange={(e) => onSmoothnessChange(Number(e.target.value))}
                className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>Natural</span>
                <span>Maximum Soft</span>
              </div>
            </div>

            {/* Whitening Filter Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-white">
                  <WandIcon className="w-4 h-4 text-purple-400" />
                  Whitening & Glow
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold tabular-nums">
                  {whitening}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={whitening}
                onChange={(e) => onWhiteningChange(Number(e.target.value))}
                className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-white/40">
                <span>Natural</span>
                <span>Radiant Glow</span>
              </div>
            </div>
          </div>

          {/* Quick Hardware Toggles: Mirror & Noise Reduction */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            {/* Camera Mirror Switch */}
            <button
              type="button"
              onClick={onToggleMirror}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                mirrored
                  ? 'bg-purple-600/25 border-purple-500/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FlipIcon className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-bold truncate">Mirror Camera</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wide ${
                  mirrored ? 'bg-purple-500 text-white shadow-xs' : 'bg-white/10 text-white/50'
                }`}
              >
                {mirrored ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Noise Reduction Switch */}
            <button
              type="button"
              onClick={onToggleNoiseReduction}
              className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                noiseActive
                  ? 'bg-emerald-600/25 border-emerald-500/50 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <NoiseIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold truncate">Noise Reduce</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wide ${
                  noiseActive ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white/10 text-white/50'
                }`}
              >
                {noiseActive ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
