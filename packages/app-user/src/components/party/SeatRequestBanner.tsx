import { motion, AnimatePresence } from 'framer-motion';
import { PiCheckBold as Check, PiXBold as X, PiArmchairFill as Armchair } from 'react-icons/pi';
import { initial } from '../../lib/time';

export interface SeatRequester {
  userId: string;
  nickname: string;
  avatar?: string;
  level?: number;
  seatIndex: number;
}

interface SeatRequestBannerProps {
  requester: SeatRequester | null;
  onAccept: (requester: SeatRequester) => void;
  onDecline: (requester: SeatRequester) => void;
}

export const SeatRequestBanner = ({
  requester,
  onAccept,
  onDecline,
}: SeatRequestBannerProps) => {
  return (
    <AnimatePresence>
      {requester && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="absolute top-16 inset-x-4 max-w-sm mx-auto z-50 bg-[#1F133D]/95 border border-amber-500/50 backdrop-blur-2xl rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 text-white pointer-events-auto"
        >
          {/* Avatar & User Details */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-black/40 ring-2 ring-amber-500/50 shrink-0 flex items-center justify-center">
              {requester.avatar ? (
                <img src={requester.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">
                  {initial(requester.nickname || 'U')}
                </span>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shadow">
                <Armchair className="w-2 h-2 text-white" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h5 className="text-xs font-bold text-white truncate max-w-[120px]">
                  {requester.nickname}
                </h5>
                {requester.level && (
                  <span className="px-1 py-0.2 rounded text-[8px] font-black bg-pink-500 text-white">
                    Lv.{requester.level}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-amber-300 font-semibold truncate">
                Wants to sit on <span className="underline font-bold">Seat {requester.seatIndex}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onAccept(requester)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-500/30 active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => onDecline(requester)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white active:scale-95"
              aria-label="Decline"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
