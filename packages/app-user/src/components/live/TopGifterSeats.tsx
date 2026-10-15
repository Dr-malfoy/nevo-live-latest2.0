import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiGiftFill as GiftIcon,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiCrownFill as Crown,
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
  isSpeaker?: boolean;
  micRequestPending?: boolean;
  onRequestMic?: () => void;
  giftBurst?: { id: string; gift: any; count: number; nickname: string } | null;
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
  isSpeaker,
  micRequestPending,
  onRequestMic,
  giftBurst,
  onViewProfile,
  onOpenGiftToUser,
  onMuteSpeaker,
  onKickSpeaker,
}: TopGifterSeatsProps) => {
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);

  // Floating gift animation particles per slot ("gift korle float hbe ei jaiga gulate")
  const [floatingParticles, setFloatingParticles] = useState<
    { id: string; slotIndex: number; icon: string; count: number }[]
  >([]);

  // Build the 5 vertical slots
  const slots: SlotData[] = Array.from({ length: 5 }, (_, i) => {
    // Only consider gifters with totalGifts > 0 as true top gifters
    const validGifters = topGifters.filter((g) => (g.totalGifts || 0) > 0);
    const gifter = validGifters[i];

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

    // If no gifter at this slot, place active speakers who are not yet in topGifters
    const unplacedSpeakers = speakers.filter(
      (s) => !validGifters.some((g) => g.userId === s.userId)
    );
    const unplacedIndex = i - validGifters.length;
    const speaker = unplacedSpeakers[unplacedIndex];

    if (speaker) {
      return {
        index: i,
        userId: speaker.userId,
        nickname: speaker.nickname,
        avatar: speaker.avatar,
        totalGifts: 0, // No gifts yet -> by default NO gift box badge
        isSpeaker: true,
        isMuted: speaker.isMuted,
      };
    }

    // Default clean empty slot (normal mic seat)
    return {
      index: i,
      totalGifts: 0,
    };
  });

  // Trigger floating gift particle animation when a gift is sent
  useEffect(() => {
    if (!giftBurst) return;

    // Determine target slot by matching nickname
    let targetIndex = slots.findIndex(
      (s) => s.nickname && s.nickname.toLowerCase() === giftBurst.nickname.toLowerCase()
    );
    if (targetIndex < 0) targetIndex = 0; // Default to rank 1 seat if not matched

    const newParticle = {
      id: `${Date.now()}-${Math.random()}`,
      slotIndex: targetIndex,
      icon: giftBurst.gift?.icon || (giftBurst.gift as any)?.animation || '🎁',
      count: giftBurst.count || 1,
    };

    setFloatingParticles((prev) => [...prev.slice(-4), newParticle]);

    const timer = setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 2200);

    return () => clearTimeout(timer);
  }, [giftBurst?.id]);

  return (
    <>
      {/* 5 Vertical Slots on the Right Side of the screen */}
      <div className="absolute right-2.5 top-28 z-20 flex flex-col gap-2.5 pointer-events-auto select-none">
        {slots.map((slot, i) => {
          const hasOccupant = !!slot.userId;
          const hasGifts = (slot.totalGifts || 0) > 0;
          const isSpeaking = slot.isSpeaker && !slot.isMuted;

          // If the slot is empty, make it completely transparent ("container gula thakbe but ei skull gula thakbe na")
          if (!hasOccupant) {
            return (
              <div
                key={slot.index}
                className="w-[50px] h-[64px] relative pointer-events-none select-none opacity-0"
                aria-hidden="true"
              >
                {/* Floating gift particles specifically rising up from this seat slot if a gift hits it */}
                <AnimatePresence>
                  {floatingParticles
                    .filter((p) => p.slotIndex === i)
                    .map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8, scale: 0.6 }}
                        animate={{ opacity: 1, y: -36, scale: 1.15 }}
                        exit={{ opacity: 0, y: -50, scale: 0.7 }}
                        transition={{ duration: 1.8, ease: 'easeOut' }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 px-2 py-0.5 rounded-lg shadow-xl border border-white/40"
                      >
                        <span className="text-xs">{p.icon}</span>
                        <span className="text-[10px] font-black text-white leading-none whitespace-nowrap">
                          +{p.count}
                        </span>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            );
          }

          const ringClass = isSpeaking
            ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/40 animate-pulse'
            : hasGifts && i === 0
            ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/20'
            : hasGifts && i === 1
            ? 'ring-2 ring-slate-300'
            : hasGifts && i === 2
            ? 'ring-2 ring-amber-600'
            : hasOccupant
            ? 'ring-1 ring-white/40'
            : 'ring-1 ring-white/20';

          return (
            <motion.button
              key={slot.index}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedSlot(slot)}
              className="flex flex-col items-center w-[50px] relative group pointer-events-auto"
              aria-label={`Rank ${i + 1}: ${slot.nickname}`}
            >
              {/* Floating gift particles specifically rising up from this seat */}
              <AnimatePresence>
                {floatingParticles
                  .filter((p) => p.slotIndex === i)
                  .map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 8, scale: 0.6 }}
                      animate={{ opacity: 1, y: -36, scale: 1.15 }}
                      exit={{ opacity: 0, y: -50, scale: 0.7 }}
                      transition={{ duration: 1.8, ease: 'easeOut' }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-1 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 px-2 py-0.5 rounded-lg shadow-xl border border-white/40"
                    >
                      <span className="text-xs">{p.icon}</span>
                      <span className="text-[10px] font-black text-white leading-none whitespace-nowrap">
                        +{p.count}
                      </span>
                    </motion.div>
                  ))}
              </AnimatePresence>

              {/* Avatar Container with Gift Box */}
              <div className="relative">
                {/* Gift Box Badge at Top-Right ("box akare hobe and by default thakbe na kew gift korlei asbe") */}
                <AnimatePresence>
                  {hasGifts && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, y: 6 }}
                      animate={{
                        scale: 1,
                        opacity: 1,
                        y: [0, -2.5, 0], // Gentle perpetual hover float
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        y: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
                        scale: { type: 'spring', stiffness: 400, damping: 20 },
                      }}
                      className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-lg bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 flex items-center gap-0.5 shadow-md shadow-pink-500/30 border border-white/40 z-10 select-none"
                    >
                      <GiftIcon className="w-2.5 h-2.5 text-white shrink-0 drop-shadow" />
                      <span className="text-[9px] font-black text-white leading-none tracking-tight">
                        {compactNumber(slot.totalGifts)}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Circular Avatar */}
                <div
                  className={`w-11 h-11 rounded-full overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all ${ringClass}`}
                >
                  {slot.avatar ? (
                    <img src={slot.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs font-bold">
                      {initial(slot.nickname || 'G')}
                    </span>
                  )}
                </div>

                {/* Rank 1 Crown icon indicator (only if someone has gifted) */}
                {i === 0 && hasGifts && (
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
                  {slot.nickname}
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
                    {selectedSlot.index === 0 && selectedSlot.totalGifts > 0 && (
                      <div className="absolute -top-2 -left-1 w-5 h-5 text-amber-300 drop-shadow">
                        <Crown className="w-full h-full" />
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                      {selectedSlot.nickname}
                    </h4>
                    {selectedSlot.totalGifts > 0 ? (
                      <>
                        <p className="text-[11px] text-pink-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                          <GiftIcon className="w-3 h-3" /> Total Gifted: {compactNumber(selectedSlot.totalGifts)}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">
                          Rank #{selectedSlot.index + 1} Gifter
                        </span>
                      </>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/70">
                        Mic Seat #{selectedSlot.index + 1} Co-Speaker
                      </span>
                    )}
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
                <div className="text-center py-2 flex flex-col items-center w-full">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 text-white/40">
                    <Mic className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-0.5">
                    Mic Seat #{selectedSlot.index + 1} Available
                  </h4>
                  <p className="text-[11px] text-white/60 max-w-[220px] mb-3">
                    Send gifts to rank in the Top 5 gifters, or request to speak on this mic seat!
                  </p>

                  {!isHost && !isSpeaker && onRequestMic && (
                    <button
                      onClick={() => {
                        onRequestMic();
                        setSelectedSlot(null);
                      }}
                      disabled={micRequestPending}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        micRequestPending
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {micRequestPending ? 'Request Pending Host Approval...' : 'Request to Speak on Mic'}
                    </button>
                  )}

                  {onOpenGiftToUser && (
                    <button
                      onClick={() => {
                        setSelectedSlot(null);
                        onOpenGiftToUser('');
                      }}
                      className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-xs font-bold text-white shadow"
                    >
                      🎁 Send Gift to Rank Here
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
