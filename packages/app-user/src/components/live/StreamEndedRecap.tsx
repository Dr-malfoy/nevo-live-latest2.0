import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Eye, Heart } from 'lucide-react';

export interface StreamEndedRecapProps {
  duration: string;
  viewers: number | string;
  likes: number | string;
  hostName?: string;
  hostAvatar?: string;
  image?: string;
  isHost?: boolean;
  onGoHome: () => void;
}

export const formatRecapStat = (value: number | string): string => {
  if (typeof value === 'string') return value;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

export const StreamEndedRecap: React.FC<StreamEndedRecapProps> = ({
  duration,
  viewers,
  likes,
  hostName = 'Streamer',
  hostAvatar,
  image,
  isHost = true,
  onGoHome,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const targetImage = !imgError && (image || hostAvatar) ? (image || hostAvatar) : null;
  const initial = (hostName.trim()?.[0] || 'R').toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0914] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Background ambient glowing orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#9333EA]/25 blur-[120px]" />
        <div className="absolute top-1/3 -left-28 w-80 h-80 rounded-full bg-[#6366F1]/20 blur-[110px]" />
        <div className="absolute bottom-12 -right-24 w-80 h-80 rounded-full bg-[#A855F7]/20 blur-[120px]" />
        {/* Soft bokeh depth elements */}
        <div className="absolute top-1/4 right-8 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl" />
        <div className="absolute bottom-1/3 left-6 w-36 h-36 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-sm sm:max-w-md mx-auto w-full py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="w-full flex flex-col items-center"
        >
          {/* Top Glowing Title Picture / Avatar Badge */}
          <div className="relative mb-6">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#9333EA] via-[#8B5CF6] to-[#C084FC] blur-lg opacity-70 animate-pulse" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#7C3AED] via-[#9333EA] to-[#C084FC] shadow-[0_0_35px_rgba(168,85,247,0.7)] flex items-center justify-center overflow-hidden">
              {targetImage ? (
                <img
                  src={targetImage}
                  alt={hostName}
                  className="w-full h-full object-cover rounded-full bg-[#18112C]"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1D1438] flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-wider">
                    {initial}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-white text-center tracking-wider uppercase leading-tight drop-shadow-md">
            THE STREAM
            <br />
            HAS ENDED
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/60 text-center mt-2.5 font-medium">
            {isHost ? "Thanks for streaming! Here's your recap" : "Thanks for watching! Here's the recap"}
          </p>

          {/* Glassmorphic Recap Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="w-full mt-7 p-6 rounded-3xl bg-[#1C1635]/65 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
          >
            <div className="grid grid-cols-3 divide-x divide-white/[0.08]">
              {/* Duration */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <Clock className="w-6 h-6 text-[#A78BFA] stroke-[2.2]" />
                <span className="text-xs font-semibold text-white/50 mt-2.5">Duration</span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                  {duration}
                </span>
              </div>

              {/* Viewers */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <Eye className="w-6 h-6 text-[#A78BFA] stroke-[2.2]" />
                <span className="text-xs font-semibold text-white/50 mt-2.5">Viewers</span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                  {formatRecapStat(viewers)}
                </span>
              </div>

              {/* Likes */}
              <div className="flex flex-col items-center justify-center px-1 text-center">
                <Heart className="w-6 h-6 text-[#A78BFA] fill-[#A78BFA] stroke-[2.2]" />
                <span className="text-xs font-semibold text-white/50 mt-2.5">Likes</span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                  {formatRecapStat(likes)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Go Back Home Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="w-full mt-7"
          >
            <button
              type="button"
              onClick={onGoHome}
              className="w-full py-4 rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#9333EA] to-[#A855F7] text-white font-bold text-base shadow-[0_8px_28px_rgba(139,92,246,0.5)] hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Go Back Home
            </button>
          </motion.div>

          {/* Footer Subtext */}
          <p className="mt-8 text-xs text-white/40 text-center tracking-wide font-medium">
            Stream saved to your profile • Tap to view replay
          </p>
        </motion.div>
      </div>
    </div>
  );
};
