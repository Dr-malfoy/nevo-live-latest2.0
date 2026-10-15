import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiGiftFill as GiftIcon,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiCrownFill as Crown,
  PiUserFill as UserIcon,
  PiXBold as X,
  PiSignOutBold as KickIcon,
} from 'react-icons/pi';
import { compactNumber, initial } from '../../lib/time';

export interface TopGifterItem {
  userId: string;
  nickname: string;
  avatar: string;
  totalGifts: number;
}

export interface LiveSpeakerItem {
  userId: string;
  nickname: string;
  avatar: string;
  isMuted: boolean;
  approvedAt?: Date | string;
}

interface TopGifterSeatsProps {
  topGifters: TopGifterItem[];
  speakers: LiveSpeakerItem[];
  currentUserId?: string;
  isHost: boolean;
  onViewProfile?: (userId: string) => void;
  onOpenGiftToUser?: (userId: string) => void;
  onMuteSpeaker?: (userId: string, isMuted: boolean) => void;
  onKickSpeaker?: (userId: string) => void;
}

interface SlotData {
  index: number;
  userId?: string;
  nickname?: string;
  avatar?: string;
  totalGifts: number;
  isSpeaker?: boolean;
  isMuted?: boolean;
}

export const TopGifterSeats = ({
  topGifters = [],
  speakers = [],
  currentUserId,
  isHost,
  onViewProfile,
  onOpenGiftToUser,
  onMuteSpeaker,
  onKickSpeaker,
}: TopGifterSeatsProps) => {
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);

  // Build the 5 vertical slots
  const slots: SlotData[] = Array.from({ length: 5 }, (_, i) => {
    const gifter = topGifters[i];
    if (gifter) {
      const sp = speakers.find((s) => s.userId === gifter.userId);
      return {
        index: i,
        userId: gifter.userId,
        nickname: gifter.nickname,
        avatar: gifter.avatar,
        totalGifts: gifter.totalGifts || 0,
        isSpeaker: !!sp,
        isMuted: sp ? sp.isMuted : true,
      };
    }

    // If no gifter at this slot, check if an active speaker is not yet placed
    const unplacedSpeaker = speakers.find(
      (s) => !topGifters.some((g) => g.userId === s.userId)
    );

    if (unplacedSpeaker && i === topGifters.length) {
      return {
        index: i,
        userId: unplacedSpeaker.userId,
        nickname: unplacedSpeaker.nickname,
        avatar: unplacedSpeaker.avatar,
        totalGifts: 0,
        isSpeaker: true,
        isMuted: unplacedSpeaker.isMuted,
      };
    }

    // Default empty slot (displays 🎁 0)
    return {
      index: i,
      totalGifts: 0,
    };
  });

  return (
    <>
      {/* 5 Vertical Slots on the Right Side of the screen */}
      <div className="absolute right-2.5 top-24 z-20 flex flex-col gap-2.5 pointer-events-auto select-none">
        {slots.map((slot, i) => {
          const hasOccupant = !!slot.userId;
          const isSpeaking = slot.isSpeaker && !slot.isMuted;

          const ringClass = isSpeaking
            ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/40 animate-pulse'
            : i === 0 && hasOccupant
            ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/20'
            : i === 1 && hasOccupant
            ? 'ring-2 ring-slate-300'
            : i === 2 && hasOccupant
            ? 'ring-2 ring-amber-600'
            : 'ring-1 ring-white/20';

          return (
            <motion.button
              key={slot.index}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedSlot(slot)}
              className="flex flex-col items-center w-[50px] relative group"
              aria-label={hasOccupant ? `Seat ${i + 1}: ${slot.nickname}` : `Seat ${i + 1}`}
            >
              {/* Avatar Container with Gift Badge */}
              <div className="relative">
                {/* Gift Badge at Top-Right */}
                <div className="absolute -top-1.5 -right-2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center gap-0.5 shadow-md border border-white/20 z-10">
                  <GiftIcon className="w-2.5 h-2.5 text-white shrink-0" />
                  <span className="text-[9px] font-black text-white leading-none">
                    {compactNumber(slot.totalGifts)}
                  </span>
                </div>

                {/* Circular Avatar */}
                <div
                  className={`w-11 h-11 rounded-full overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all ${ringClass}`}
                >
                  {hasOccupant ? (
                    slot.avatar ? (
                      <img src={slot.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {initial(slot.nickname || 'G')}
                      </span>
                    )
                  ) : (
                    <UserIcon className="w-5 h-5 text-white/30" />
                  )}
                </div>

                {/* Rank 1 Crown icon indicator */}
                {i === 0 && hasOccupant && (
                  <div className="absolute -top-2 left-0 w-3.5 h-3.5 text-amber-300 drop-shadow">
                    <Crown className="w-full h-full" />
                  </div>
                )}
              </div>

              {/* Bottom Mic status + Nickname */}
              <div className="flex items-center justify-center gap-0.5 w-full mt-1 bg-black/50 backdrop-blur-xs rounded-full px-1 py-0.5 shadow-sm">
                {isSpeaking ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                ) : slot.isSpeaker ? (
                  <MicOff className="w-2.5 h-2.5 text-red-400 shrink-0" />
                ) : (
                  <Mic className="w-2 h-2 text-white/50 shrink-0" />
                )}
                <span className="text-[9px] text-white/90 font-medium truncate max-w-[36px] leading-tight text-center">
                  {hasOccupant ? slot.nickname : `${i + 1}`}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Seat Detail Modal / Popover */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedSlot(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xs bg-[#161726]/95 border border-white/15 rounded-3xl p-5 shadow-2xl z-10 text-white flex flex-col items-center gap-3.5"
            >
              <button
                onClick={() => setSelectedSlot(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedSlot.userId ? (
                <>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-pink-500/40 bg-black/40 flex items-center justify-center">
                      {selectedSlot.avatar ? (
                        <img src={selectedSlot.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-lg font-bold">
                          {initial(selectedSlot.nickname || 'U')}
                        </span>
                      )}
                    </div>
                    {selectedSlot.index === 0 && (
                      <div className="absolute -top-2 -left-1 w-5 h-5 text-amber-300 drop-shadow">
                        <Crown className="w-full h-full" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                      {selectedSlot.nickname}
                    </h4>
                    <p className="text-[11px] text-pink-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                      <GiftIcon className="w-3 h-3" /> Total Gifted: {compactNumber(selectedSlot.totalGifts)}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">
                      Rank #{selectedSlot.index + 1} Gifter
                    </span>
                  </div>

                  {/* Speaker Status */}
                  <div className="w-full p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-white/60">Mic Status:</span>
                    <span className="font-semibold flex items-center gap-1">
                      {selectedSlot.isSpeaker ? (
                        selectedSlot.isMuted ? (
                          <span className="text-red-400 flex items-center gap-1">
                            <MicOff className="w-3.5 h-3.5" /> Muted
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5 animate-pulse" /> Speaking
                          </span>
                        )
                      ) : (
                        <span className="text-white/50">Viewer</span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="w-full flex flex-col gap-2 mt-1">
                    {/* Host controls for speaker */}
                    {isHost && selectedSlot.isSpeaker && selectedSlot.userId !== currentUserId && (
                      <div className="flex gap-2">
                        {onMuteSpeaker && (
                          <button
                            onClick={() => {
                              onMuteSpeaker(selectedSlot.userId!, !selectedSlot.isMuted);
                              setSelectedSlot(null);
                            }}
                            className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                          >
                            {selectedSlot.isMuted ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            {selectedSlot.isMuted ? 'Unmute' : 'Mute'}
                          </button>
                        )}
                        {onKickSpeaker && (
                          <button
                            onClick={() => {
                              onKickSpeaker(selectedSlot.userId!);
                              setSelectedSlot(null);
                            }}
                            className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors text-xs font-semibold text-red-300 flex items-center justify-center gap-1.5"
                          >
                            <KickIcon className="w-3.5 h-3.5" />
                            Kick Mic
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {onViewProfile && (
                        <button
                          onClick={() => {
                            const uid = selectedSlot.userId;
                            setSelectedSlot(null);
                            if (uid) onViewProfile(uid);
                          }}
                          className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-xs font-semibold text-white"
                        >
                          Profile
                        </button>
                      )}
                      {onOpenGiftToUser && selectedSlot.userId !== currentUserId && (
                        <button
                          onClick={() => {
                            const uid = selectedSlot.userId;
                            setSelectedSlot(null);
                            if (uid) onOpenGiftToUser(uid);
                          }}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 transition-colors text-xs font-bold text-white shadow"
                        >
                          Send Gift
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 text-white/30">
                    <GiftIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Slot #{selectedSlot.index + 1} Available
                  </h4>
                  <p className="text-xs text-white/50 max-w-[200px]">
                    Send gifts in this stream to claim your position in the Top 5 gifter seats!
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
