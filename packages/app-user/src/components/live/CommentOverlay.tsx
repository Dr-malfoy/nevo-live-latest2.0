import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PiGiftFill as GiftIcon, PiStarFill as Star } from 'react-icons/pi';
import type { RoomMessage } from './types';

interface CommentOverlayProps {
  messages: RoomMessage[];
  currentUserId?: string;
}

const isGiftMsg = (m: RoomMessage) => m.isGift || !!m.gift;

const CommentBubble = ({ msg }: { msg: RoomMessage }) => {
  const nickname = msg.nickname || 'Guest';
  const message = msg.message || '';
  const isJoined = msg.kind === 'join';

  if (isJoined) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -16, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500/85 to-amber-500/85 shadow-sm mb-1 max-w-[90%] self-start text-left"
      >
        <Star className="w-3 h-3 text-white/90 shrink-0" />
        <span className="text-[11px] font-bold text-white leading-snug truncate">
          {nickname} joined
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start justify-start w-full self-start text-left"
    >
      <div
        className={`rounded-2xl px-2.5 py-1 backdrop-blur-md max-w-[95%] shadow-sm text-left ${
          isGiftMsg(msg)
            ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border border-pink-500/20'
            : 'bg-black/50 border border-white/5'
        }`}
      >
        <div className="text-[12px] leading-snug text-left break-words">
          {msg.level != null && !isGiftMsg(msg) && (
            <span className="inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-md px-1 py-0.2 text-[9px] font-black mr-1 align-baseline shadow-xs">
              Lv.{msg.level || 1}
            </span>
          )}
          <span className="font-bold text-[#5EE7F0] mr-1 inline">{nickname}:</span>
          <span className="text-white/95 font-medium">{message}</span>
          {isGiftMsg(msg) && (
            <span className="inline-flex items-center gap-0.5 ml-1 text-[11px] font-bold text-pink-300">
              <GiftIcon className="w-3 h-3 inline shrink-0" />
              sent a gift ×{msg.count || 1}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const CommentOverlay = ({ messages }: CommentOverlayProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'room' | 'chat'>('all');

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, activeTab]);

  const filteredMessages = messages.filter((m) => {
    if (activeTab === 'room') return m.kind === 'join' || m.isGift || !!m.gift;
    if (activeTab === 'chat') return m.kind !== 'join' && !m.isGift && !m.gift;
    return true;
  });

  return (
    <div className="absolute bottom-[4.25rem] left-2.5 z-20 w-[min(320px,76vw)] max-w-[320px] pointer-events-none flex gap-1.5 items-end justify-start text-left">
      {/* ── Left vertical tabs ── */}
      <div className="flex flex-col gap-1 mb-1 pointer-events-auto shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`rounded-full py-2 px-1 flex items-center justify-center transition-all ${
            activeTab === 'all' ? 'bg-[#5b5cff] shadow-md' : 'bg-black/40 hover:bg-black/60'
          }`}
        >
          <span className={`text-[9px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] ${
            activeTab === 'all' ? 'text-white' : 'text-white/60'
          }`}>
            All
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('room')}
          className={`rounded-full py-2 px-1 flex items-center justify-center transition-all ${
            activeTab === 'room' ? 'bg-[#5b5cff] shadow-md' : 'bg-black/40 hover:bg-black/60'
          }`}
        >
          <span className={`text-[9px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] ${
            activeTab === 'room' ? 'text-white' : 'text-white/60'
          }`}>
            Room
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`rounded-full py-2 px-1 flex items-center justify-center transition-all ${
            activeTab === 'chat' ? 'bg-[#5b5cff] shadow-md' : 'bg-black/40 hover:bg-black/60'
          }`}
        >
          <span className={`text-[9px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] ${
            activeTab === 'chat' ? 'text-white' : 'text-white/60'
          }`}>
            Chat
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-end items-start text-left min-w-0">
        <div
          ref={listRef}
          className="no-scrollbar flex flex-col gap-1.5 overflow-y-auto max-h-[35vh] w-full pr-1 pb-1 pointer-events-auto items-start text-left"
          aria-live="polite"
          aria-label="Live chat messages"
        >
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg, i) => (
              <CommentBubble key={`${msg.userId}-${msg.message}-${i}`} msg={msg} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};