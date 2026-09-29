import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X } from 'react-icons/pi';
import { FILTERS } from '../../hooks/useVideoFilters';

interface FilterPickerProps {
  open: boolean;
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export const FilterPicker = ({ open, activeId, onSelect, onClose }: FilterPickerProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="absolute bottom-24 inset-x-3 z-40 glass-card p-3"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-white/80">Filters</p>
          <button onClick={onClose} aria-label="Close filters" className="p-1 text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              aria-pressed={activeId === f.id}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all border ${
                activeId === f.id
                  ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white border-transparent shadow-glow-sm'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
