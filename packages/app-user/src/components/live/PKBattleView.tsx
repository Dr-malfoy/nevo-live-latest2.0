import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiFlameFill as Flame,
  PiXBold as X,
  PiGearSixFill as SettingsIcon,
  PiCaretLeftBold as CaretLeft,
  PiGiftFill as GiftIcon,
  PiHeartFill as Heart,
  PiPaperPlaneRightFill as SendIcon,
  PiShareNetworkFill as ShareIcon,
  PiTrophyFill as Trophy,
  PiCrownFill as Crown,
  PiCheckBold as Check,
  PiLightningFill as Lightning,
} from 'react-icons/pi';
import { getMediaUrl } from '../../lib/media';
import type { LiveHost, RoomMessage } from './types';

export interface PKHostData {
  userId: string;
  streamId?: string;
  nickname: string;
  avatar?: string;
  level?: number;
  score: number;
  viewerCount?: number;
  winStreak?: number;
}

export interface PKRecentGift {
  id: string;
  icon: string;
  points: number;
  senderName: string;
  hostSide: 'left' | 'right';
}

interface PKBattleViewProps {
  battleId: string;
  initialDurationSeconds?: number;
  leftHost: PKHostData;
  rightHost: PKHostData;
  isHost: boolean;
  currentUserId?: string;
  messages: RoomMessage[];
  onSendMessage: (msg: string) => void;
  onSendGift: (targetHostId: string, hostSide: 'left' | 'right') => void;
  onEndPK?: () => void;
  onQuitPK?: () => void;
  onMinimize?: () => void;
  onLike?: () => void;
  likeCount?: number;
  recentGifts?: PKRecentGift[];
}

export const PKBattleView: React.FC<PKBattleViewProps> = ({
  battleId,
  initialDurationSeconds = 180,
  leftHost,
  rightHost,
  isHost,
  currentUserId,
  messages,
  onSendMessage,
  onSendGift,
  onEndPK,
  onQuitPK,
  onMinimize,
  onLike,
  likeCount = 0,
  recentGifts = [],
}) => {
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(initialDurationSeconds);
  const [isFinished, setIsFinished] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>(
    currentUserId === rightHost.userId ? 'right' : 'left'
  );

  // Score computation
  const leftScore = leftHost.score || 0;
  const rightScore = rightHost.score || 0;
  const totalScore = leftScore + rightScore;
  const leftPct = totalScore > 0 ? (leftScore / totalScore) * 100 : 50;
  const leadDiff = Math.abs(leftScore - rightScore);
  const leadSide = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie';

  // Winner determination
  const winner = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie';

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsFinished(true);
      onEndPK?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsFinished(true);
          onEndPK?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onEndPK]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendMessage(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0b0814] text-white overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-purple-700/25 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-20 right-0 w-72 h-72 bg-pink-700/25 rounded-full blur-[100px] pointer-events-none" />

      {/* Top PK Battle Bar */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={onMinimize}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/80"
          aria-label="Minimize"
        >
          <CaretLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-900/60 to-pink-900/60 border border-purple-500/30 backdrop-blur-md">
          <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider text-purple-200 uppercase">
            PK BATTLE • LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              type="button"
              onClick={onQuitPK}
              className="w-9 h-9 rounded-full bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 transition-colors flex items-center justify-center text-red-200"
              title="Quit PK"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/80"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Round Timer Capsule */}
      <div className="relative z-10 flex justify-center shrink-0 mb-2">
        <div className="flex flex-col items-center px-5 py-1 rounded-2xl bg-black/60 border border-purple-500/40 backdrop-blur-xl shadow-[0_0_18px_rgba(168,85,247,0.35)]">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black tracking-widest text-purple-200 tabular-nums">
              ⏱ {formatTime(timeLeft)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase">
            Round 1 of 1
          </span>
        </div>
      </div>

      {/* Split Feeds Area: Host Left vs Host Right */}
      <div className="relative z-10 px-2 shrink-0">
        <div className="relative flex gap-2 h-52 sm:h-64 rounded-3xl overflow-hidden p-1 bg-gradient-to-r from-purple-900/40 via-black to-pink-900/40 border border-purple-500/30 shadow-2xl">
          {/* Host A (Left) */}
          <div
            onClick={() => setSelectedSide('left')}
            className={`relative flex-1 rounded-2xl overflow-hidden bg-[#181226] border-2 transition-all cursor-pointer ${
              selectedSide === 'left'
                ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'border-white/10'
            }`}
          >
            {/* Live Feed Video or Avatar Poster */}
            <div className="absolute inset-0 z-0">
              {leftHost.avatar ? (
                <img
                  src={getMediaUrl(leftHost.avatar)}
                  alt={leftHost.nickname}
                  className="w-full h-full object-cover scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-950 to-indigo-950 flex items-center justify-center font-bold text-2xl text-purple-300">
                  {leftHost.nickname.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
            </div>

            {/* Top Badge: LIVE & Viewers */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-[8px] font-black text-white flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[9px] font-bold text-white/80">
                👁 {leftHost.viewerCount ? `${(leftHost.viewerCount / 1000).toFixed(1)}K` : '1'}
              </span>
            </div>

            {/* Bottom Overlay: Host Info & Score */}
            <div className="absolute bottom-2 inset-x-2 z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/40 shrink-0">
                  <img
                    src={getMediaUrl(leftHost.avatar || '')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-white truncate leading-tight">
                    {leftHost.nickname}
                  </p>
                  <span className="text-[8px] text-purple-300 font-bold uppercase">
                    Rank {leftHost.level || 1}
                  </span>
                </div>
              </div>

              {/* Left Score */}
              <div className="flex items-baseline justify-between">
                <span className="text-[9px] uppercase tracking-wider text-purple-300 font-bold">
                  PK SCORE
                </span>
                <span className="text-base font-black text-purple-300 tabular-nums drop-shadow">
                  {leftScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Electric VS Badge (Centered over the split) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-pink-600 border-2 border-white flex items-center justify-center shadow-[0_0_25px_rgba(236,72,153,0.8)]"
            >
              <Lightning className="absolute -top-2 text-yellow-300 w-5 h-5 drop-shadow" />
              <span className="text-xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                VS
              </span>
              <Lightning className="absolute -bottom-2 text-yellow-300 w-5 h-5 drop-shadow" />
            </motion.div>
          </div>

          {/* Host B (Right) */}
          <div
            onClick={() => setSelectedSide('right')}
            className={`relative flex-1 rounded-2xl overflow-hidden bg-[#181226] border-2 transition-all cursor-pointer ${
              selectedSide === 'right'
                ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                : 'border-white/10'
            }`}
          >
            {/* Live Feed Video or Avatar Poster */}
            <div className="absolute inset-0 z-0">
              {rightHost.avatar ? (
                <img
                  src={getMediaUrl(rightHost.avatar)}
                  alt={rightHost.nickname}
                  className="w-full h-full object-cover scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-950 to-rose-950 flex items-center justify-center font-bold text-2xl text-pink-300">
                  {rightHost.nickname.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
            </div>

            {/* Top Badge: LIVE & Viewers */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-[8px] font-black text-white flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[9px] font-bold text-white/80">
                👁 {rightHost.viewerCount ? `${(rightHost.viewerCount / 1000).toFixed(1)}K` : '1'}
              </span>
            </div>

            {/* Bottom Overlay: Host Info & Score */}
            <div className="absolute bottom-2 inset-x-2 z-10 text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-white truncate leading-tight">
                    {rightHost.nickname}
                  </p>
                  <span className="text-[8px] text-pink-300 font-bold uppercase">
                    Team {rightHost.nickname}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/40 shrink-0">
                  <img
                    src={getMediaUrl(rightHost.avatar || '')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Right Score */}
              <div className="flex items-baseline justify-between">
                <span className="text-base font-black text-pink-300 tabular-nums drop-shadow">
                  {rightScore.toLocaleString()}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-pink-300 font-bold">
                  PK SCORE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tug-of-War Score Bar & Lead Difference */}
        <div className="relative mt-2 px-1">
          <div className="relative h-3 rounded-full overflow-hidden bg-white/10 p-0.5 shadow-inner">
            {/* Animated left bar (Purple) */}
            <motion.div
              animate={{ width: `${leftPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-l-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
            />
            {/* Animated right bar (Pink) */}
            <motion.div
              animate={{ width: `${100 - leftPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-500 via-pink-500 to-fuchsia-400 rounded-r-full shadow-[0_0_10px_rgba(244,63,94,0.8)]"
            />
          </div>

          {/* Lead Pill */}
          <div className="flex justify-center -mt-2">
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md border ${
                leadSide === 'left'
                  ? 'bg-purple-600 text-white border-purple-400'
                  : leadSide === 'right'
                  ? 'bg-pink-600 text-white border-pink-400'
                  : 'bg-white/20 text-white/70 border-white/20'
              }`}
            >
              {leadSide === 'tie' ? 'TIED' : `LEAD ▲ +${leadDiff.toLocaleString()}`}
            </span>
          </div>
        </div>
      </div>

      {/* PK Rules & Win Streak Strip */}
      <div className="relative z-10 px-4 py-1.5 flex items-center justify-between text-[11px] font-bold text-white/60 border-b border-white/5 shrink-0">
        <span className="flex items-center gap-1">
          <span className="text-purple-300 font-extrabold uppercase">PK RULES:</span>
          Higher score when timer ends wins!
        </span>
        <span className="flex items-center gap-1 text-orange-400 shrink-0">
          <Flame className="w-3.5 h-3.5" />
          Win Streak: {leftHost.winStreak || 4}
        </span>
      </div>

      {/* GIFTS • LIVE Recent Gifts Strip */}
      <div className="relative z-10 px-3 py-1.5 border-b border-white/5 shrink-0 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-purple-300 flex items-center gap-1">
            <GiftIcon className="w-3.5 h-3.5" /> GIFTS • LIVE
          </span>
          <span className="text-[10px] text-white/40 font-bold">2.1k Gifts</span>
        </div>

        {/* Gift strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {recentGifts.length > 0 ? (
            recentGifts.slice(-6).map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shrink-0 text-xs font-black shadow-sm"
              >
                <span>{g.icon}</span>
                <span className={g.hostSide === 'left' ? 'text-purple-300' : 'text-pink-300'}>
                  +{g.points}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shrink-0 text-xs font-black text-cyan-300">
                <span>💎</span> +999
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shrink-0 text-xs font-black text-fuchsia-300">
                <span>🚀</span> +500
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shrink-0 text-xs font-black text-amber-300">
                <span>🎁</span> +66
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 shrink-0 text-xs font-black text-pink-300">
                <span>👑</span> +2000
              </div>
            </>
          )}
        </div>
      </div>

      {/* Merged Audience Chat Feed */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
        {messages.slice(-8).map((m, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 bg-black/35 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/5"
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0 mt-0.5">
              {m.avatar ? (
                <img src={getMediaUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-purple-900 flex items-center justify-center text-[10px]">
                  {m.nickname?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <div className="text-xs leading-snug">
              <span className="font-extrabold text-purple-300 mr-1.5">{m.nickname}:</span>
              <span className="text-white/90">{m.message}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Bar: Support Target Selector + Gifting + Chat */}
      <div className="relative z-10 px-3 py-2.5 bg-[#120d1e] border-t border-purple-500/20 shrink-0">
        {/* Support Selection Banner */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold text-white/60">Supporting:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedSide('left')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all ${
                selectedSide === 'left'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/50'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {leftHost.nickname}
            </button>
            <span className="text-white/30 text-xs">/</span>
            <button
              type="button"
              onClick={() => setSelectedSide('right')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all ${
                selectedSide === 'right'
                  ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/50'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {rightHost.nickname}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Send Gift Button */}
          <button
            type="button"
            onClick={() => {
              const target = selectedSide === 'left' ? leftHost.userId : rightHost.userId;
              onSendGift(target, selectedSide);
            }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg shadow-pink-500/30 shrink-0"
            title={`Send Gift to ${selectedSide === 'left' ? leftHost.nickname : rightHost.nickname}`}
          >
            <GiftIcon className="w-5 h-5 animate-bounce" />
          </button>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="flex-1 flex items-center gap-1.5">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Send message to ${
                selectedSide === 'left' ? leftHost.nickname : rightHost.nickname
              }’s team…`}
              className="w-full h-11 px-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white placeholder-white/40"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="w-11 h-11 rounded-2xl bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Like */}
          <button
            type="button"
            onClick={onLike}
            className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all flex flex-col items-center justify-center text-rose-400 shrink-0"
          >
            <Heart className="w-5 h-5 fill-current" />
            <span className="text-[9px] font-bold text-white/70 leading-none">
              {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
            </span>
          </button>
        </div>
      </div>

      {/* Victory / Defeat Overlay at Battle Finish */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center"
          >
            <motion.div
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.6)] mb-4">
                <Trophy className="w-12 h-12 text-black" />
              </div>

              <h2 className="text-3xl font-black text-white tracking-wider uppercase mb-1">
                {winner === 'tie'
                  ? 'BATTLE TIED!'
                  : winner === 'left'
                  ? `${leftHost.nickname} WINS!`
                  : `${rightHost.nickname} WINS!`}
              </h2>

              <p className="text-sm text-purple-300 font-bold mb-6">
                Final Score: {leftScore.toLocaleString()} vs {rightScore.toLocaleString()}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onQuitPK}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-black text-sm text-white shadow-xl shadow-purple-600/40"
                >
                  Return to Normal Live
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
