import { motion } from 'framer-motion';

/** Shimmer skeleton shown while connecting to the stream. */
export const LiveSkeleton = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    role="status"
    aria-busy="true"
    aria-label="Connecting to stream"
    className="absolute inset-0 z-50 flex flex-col bg-[#0B0B0F] overflow-hidden"
  >
    {/* Shimmer base */}
    <div className="absolute inset-0 bg-gradient-to-br from-[#12121a] via-[#0B0B0F] to-[#1a1026]">
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>

    {/* Fake host card */}
    <div className="relative flex items-center gap-3 p-4">
      <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-white/10 animate-pulse" />
        <div className="h-2 w-16 rounded-full bg-white/5 animate-pulse" />
      </div>
    </div>

    {/* Fake chat bubbles */}
    <div className="relative mt-auto space-y-3 px-4 pb-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-2" style={{ opacity: 1 - i * 0.25 }}>
          <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 rounded-full bg-white/10 animate-pulse" />
            <div className="h-7 w-40 rounded-xl bg-white/10 animate-pulse" />
          </div>
        </div>
      ))}
    </div>

    {/* Status text */}
    <div className="relative pb-10 text-center">
      <p className="text-white/60 text-sm font-medium tracking-wide">Connecting to stream...</p>
    </div>
  </motion.div>
);
