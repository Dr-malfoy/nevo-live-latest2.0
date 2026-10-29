import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiChartLineUpBold as ChartIcon,
  PiUsersBold as Users,
  PiUserMinusBold as UserMinus,
  PiGiftBold as GiftIcon,
  PiDiamondBold as DiamondIcon,
  PiClockBold as ClockIcon,
  PiHeartBold as HeartIcon,
} from 'react-icons/pi';

export interface LiveDataStats {
  usersJoined?: number;
  totalJoined?: number;
  usersLeft?: number;
  totalLeft?: number;
  giftsCount?: number;
  totalGifts?: number;
  valuationDiamonds?: number;
  valuation?: number;
  elapsedSeconds?: number;
  liveTime?: string;
  likeCount?: number;
  totalLikes?: number;
  peakViewers?: number;
}

interface LiveDataModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  stats: LiveDataStats;
  streamTitle?: string;
}

const formatDuration = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = safeSeconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const LiveDataModal: React.FC<LiveDataModalProps> = ({
  open,
  isOpen,
  onClose,
  stats,
  streamTitle = 'Live Room',
}) => {
  const isModalOpen = Boolean(isOpen ?? open);
  if (!isModalOpen) return null;

  const joined = stats.totalJoined ?? stats.usersJoined ?? 0;
  const left = stats.totalLeft ?? stats.usersLeft ?? 0;
  const gifts = stats.totalGifts ?? stats.giftsCount ?? 0;
  const valuation = stats.valuation ?? stats.valuationDiamonds ?? 0;
  const likes = stats.totalLikes ?? stats.likeCount ?? 0;
  const peak = stats.peakViewers ?? 1;

  // Format live duration
  let liveDurationDisplay = '00:00';
  if (stats.liveTime) {
    liveDurationDisplay = stats.liveTime;
  } else if (typeof stats.elapsedSeconds === 'number') {
    liveDurationDisplay = formatDuration(stats.elapsedSeconds);
  }

  const cards = [
    {
      label: 'Live Time',
      value: liveDurationDisplay,
      icon: ClockIcon,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    },
    {
      label: 'Valuation',
      value: `${valuation.toLocaleString()} 💎`,
      icon: DiamondIcon,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30',
    },
    {
      label: 'Users Joined',
      value: joined.toLocaleString(),
      icon: Users,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      label: 'Users Left',
      value: left.toLocaleString(),
      icon: UserMinus,
      color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30',
    },
    {
      label: 'Gifts Received',
      value: gifts.toLocaleString(),
      icon: GiftIcon,
      color: 'from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30',
    },
    {
      label: 'Total Likes',
      value: likes.toLocaleString(),
      icon: HeartIcon,
      color: 'from-red-500/20 to-pink-500/20 text-red-400 border-red-500/30',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#141226]/95 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-white z-10 backdrop-blur-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                <ChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Live Data Analytics</h3>
                <p className="text-xs text-white/50 truncate max-w-[200px]">{streamTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl bg-gradient-to-br ${c.color} border flex flex-col justify-between gap-1 shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-white/70">{c.label}</span>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="text-lg font-black tracking-tight text-white mt-1 tabular-nums">
                    {c.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Peak Viewers Highlight */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              <span className="text-xs font-semibold text-white/80">Peak Audience Concurrency</span>
            </div>
            <span className="text-sm font-black text-emerald-400 tabular-nums">
              {peak.toLocaleString()} Viewers
            </span>
          </div>

          {/* Footer Note */}
          <p className="text-[11px] text-white/40 text-center leading-relaxed">
            Real-time analytics for current session. Final valuation and rewards settle upon ending live.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
