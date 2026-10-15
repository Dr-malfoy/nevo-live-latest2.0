import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiMagicWandFill as Wand2, PiCheckBold as Check, PiSparkleFill as Sparkles } from 'react-icons/pi';
import { FILTERS } from '../../hooks/useVideoFilters';

interface FilterPickerProps {
  open: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

interface FilterVisual {
  subtitle: string;
  gradient: string;
  dotColor: string;
}

const FILTER_VISUALS: Record<string, FilterVisual> = {
  natural: {
    subtitle: 'Original',
    gradient: 'from-slate-600 to-zinc-700',
    dotColor: '#94a3b8',
  },
  warm: {
    subtitle: 'Golden Sun',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    dotColor: '#f59e0b',
  },
  cool: {
    subtitle: 'Icy Fresh',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    dotColor: '#38bdf8',
  },
  bright: {
    subtitle: 'Radiant',
    gradient: 'from-yellow-300 via-amber-400 to-pink-500',
    dotColor: '#fde047',
  },
  'soft-glow': {
    subtitle: 'Smooth Skin',
    gradient: 'from-rose-400 via-fuchsia-400 to-pink-500',
    dotColor: '#f43f5e',
  },
  vintage: {
    subtitle: 'Retro 90s',
    gradient: 'from-yellow-800 via-amber-700 to-amber-900',
    dotColor: '#d97706',
  },
  cinematic: {
    subtitle: 'Movie Look',
    gradient: 'from-teal-500 via-cyan-600 to-amber-600',
    dotColor: '#14b8a6',
  },
  dreamy: {
    subtitle: 'Vibrant Pop',
    gradient: 'from-fuchsia-500 via-purple-600 to-indigo-600',
    dotColor: '#d946ef',
  },
};

export const FilterPicker = ({ open, activeId, onSelect, onClose }: FilterPickerProps) => {
  const currentFilter = FILTERS.find((f) => f.id === activeId) || FILTERS[0];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
          {/* Subtle backdrop click to dismiss */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
          />

          {/* Filter Container Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="relative w-full max-w-md bg-[#131422]/95 border-t border-white/15 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] pb-safe p-4 text-white z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 text-white">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white tracking-wide">Beauty & Filters</h4>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Active:{' '}
                    <span className="text-pink-400 font-semibold">{currentFilter.label}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeId !== 'natural' && (
                  <button
                    onClick={() => onSelect('natural')}
                    className="text-[11px] font-semibold text-white/60 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close filters"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Filter Cards Row */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-2 px-1">
              {FILTERS.map((f) => {
                const visual = FILTER_VISUALS[f.id] || {
                  subtitle: 'Effect',
                  gradient: 'from-pink-500 to-purple-500',
                  dotColor: '#ec4899',
                };
                const isSelected = activeId === f.id;

                return (
                  <motion.button
                    key={f.id}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onSelect(f.id)}
                    aria-pressed={isSelected}
                    className={`shrink-0 flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border w-20 ${
                      isSelected
                        ? 'bg-gradient-to-b from-pink-500/25 to-purple-500/15 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.35)] ring-2 ring-pink-500/50'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white/80'
                    }`}
                  >
                    {/* Filter Color Swatch / Circle Preview */}
                    <div
                      className={`relative w-11 h-11 rounded-full bg-gradient-to-tr ${visual.gradient} shadow-md flex items-center justify-center transition-transform ${
                        isSelected ? 'scale-105' : ''
                      }`}
                    >
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      ) : f.id === 'natural' ? (
                        <Sparkles className="w-4 h-4 text-white/80" />
                      ) : null}
                    </div>

                    {/* Filter Name & Subtitle */}
                    <div className="flex flex-col items-center text-center leading-tight">
                      <span
                        className={`text-[11px] font-bold truncate w-full ${
                          isSelected ? 'text-white' : 'text-white/80'
                        }`}
                      >
                        {f.label}
                      </span>
                      <span className="text-[9px] text-white/45 truncate w-full font-medium">
                        {visual.subtitle}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
