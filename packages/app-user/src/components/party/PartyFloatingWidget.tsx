import { motion } from 'framer-motion';
import {
  PiXBold as X,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiArrowsOutSimpleBold as MaximizeIcon,
} from 'react-icons/pi';
import { initial } from '../../lib/time';

export interface PartyFloatingWidgetProps {
  roomName?: string;
  host?: {
    _id?: string;
    nickname?: string;
    avatar?: string;
  } | null;
  viewerCount?: number;
  micOn?: boolean;
  canSpeak?: boolean;
  onToggleMic?: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

/**
 * Dedicated Round Floating Minimized Party Window.
 *
 * Requirements:
 * - Completely ROUND circular widget with draggable gesture.
 * - Displays the Party Host's profile picture / avatar.
 * - Displays animated voice soundwave ripples and pulsing audio equalizer.
 * - Allows quick mic toggle and close directly from the mini bubble.
 * - Tapping anywhere on the circle maximizes back to the full party room.
 */
export const PartyFloatingWidget = ({
  roomName,
  host,
  viewerCount,
  micOn = false,
  canSpeak = false,
  onToggleMic,
  onMaximize,
  onClose,
}: PartyFloatingWidgetProps) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{
        left: typeof window !== 'undefined' ? -(window.innerWidth - 100) : -250,
        right: 0,
        top: typeof window !== 'undefined' ? -(window.innerHeight - 140) : -400,
        bottom: 20,
      }}
      onClick={onMaximize}
      aria-label="Party Minimized Floating Window"
      className="fixed bottom-28 right-4 z-50 select-none touch-none cursor-pointer flex flex-col items-center justify-center animate-fade-in"
      style={{ width: '84px', height: '84px' }}
    >
      {/* ── Outer Voice Ripple Waves (Pulsing concentric circles) ── */}
      <span
        className="absolute -inset-2.5 rounded-full border-2 border-pink-500/40 pointer-events-none animate-ping"
        style={{ animationDuration: '2.4s' }}
      />
      <span
        className="absolute -inset-1.5 rounded-full border-2 border-purple-400/50 pointer-events-none animate-pulse shadow-[0_0_20px_rgba(236,72,153,0.55)]"
      />

      {/* ── Round Bubble Body ── */}
      <div className="relative w-full h-full rounded-full overflow-hidden p-[3px] bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 shadow-[0_10px_30px_rgba(0,0,0,0.85)] border border-white/20">
        {/* Host Profile Picture */}
        <div className="w-full h-full rounded-full overflow-hidden bg-[#180B35] relative flex items-center justify-center">
          {host?.avatar ? (
            <img
              src={host.avatar}
              alt={host.nickname || 'Host'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-lg font-black text-white bg-gradient-to-br from-purple-700 to-indigo-900">
              {initial(host?.nickname || roomName || 'P')}
            </span>
          )}

          {/* Semi-transparent dark vignette at bottom for equalizer contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

          {/* ── Voice Soundwave Animation (Equalizer bars) ── */}
          <div className="absolute bottom-1.5 inset-x-0 flex items-center justify-center gap-0.5 pointer-events-none">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-pink-400 via-purple-300 to-white animate-pulse shadow-sm"
                style={{
                  height: `${7 + (i % 3) * 5}px`,
                  animationDuration: `${0.45 + (i % 3) * 0.2}s`,
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Floating "PARTY" Tag Badge ── */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-[8px] font-black text-white shadow-md uppercase tracking-wider border border-white/30 flex items-center gap-1 pointer-events-none z-20 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>PARTY</span>
      </div>

      {/* ── Top-Right Close Button (✕) ── */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close Party"
        title="Leave Party"
        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white/80 active:scale-90 hover:bg-red-700 transition-all pointer-events-auto z-30"
      >
        <X className="w-3 h-3 text-white" strokeWidth={3} />
      </button>

      {/* ── Bottom-Left Mic Toggle Button (if on seat or host) ── */}
      {canSpeak && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMic?.();
          }}
          aria-label={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
          title={micOn ? 'Mute Mic' : 'Turn Mic On'}
          className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white/80 active:scale-90 transition-all pointer-events-auto z-30 ${
            micOn
              ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.8)]'
              : 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]'
          }`}
        >
          {micOn ? (
            <Mic className="w-3 h-3 text-white" />
          ) : (
            <MicOff className="w-3 h-3 text-white" />
          )}
        </button>
      )}

      {/* ── Bottom-Right Maximize Hint Indicator ── */}
      <div
        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/60 border border-white/40 text-white/80 flex items-center justify-center shadow pointer-events-none z-10"
        title="Tap to expand"
      >
        <MaximizeIcon className="w-2.5 h-2.5" />
      </div>
    </motion.div>
  );
};
