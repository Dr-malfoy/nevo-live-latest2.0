import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiTrophyFill as Trophy,
  PiCrownFill as Crown,
  PiCircleNotchBold as Spinner,
  PiFlameFill as Flame,
  PiSwordBold as Swords,
  PiMedalFill as Medal,
} from 'react-icons/pi';
import { pkApi, type DailyPkHost } from '../../api/pk.api';
import { getMediaUrl } from '../../lib/media';

interface PKRankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const PKRankModal: React.FC<PKRankModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<DailyPkHost[]>([]);
  const [myRank, setMyRank] = useState<{
    rank: number;
    score: number;
    battlesCount: number;
    wins: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    pkApi
      .getDailyPkRank()
      .then((res) => {
        if (!active) return;
        setLeaderboard(res?.leaderboard || []);
        if (res?.myRankInfo) {
          setMyRank({
            rank: res.myRankInfo.rank,
            score: res.myRankInfo.totalScore,
            battlesCount: res.myRankInfo.battlesCount,
            wins: res.myRankInfo.wins,
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load PK ranking:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-[#1f1633] via-[#140e24] to-[#0a0712] border-t border-amber-500/30 rounded-t-[28px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(245,158,11,0.2)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                DAILY PK RANKING
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 uppercase">
                  Today
                </span>
              </h3>
              <p className="text-[11px] text-white/50">Total PK battle scores earned by hosts today</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-white/50">
              <Spinner className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Loading today's PK champions…</span>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white/80">No PK Battles Today Yet</p>
                <p className="text-xs text-white/40 mt-1 max-w-xs">
                  Challenge another live host to a PK Battle and be the first to claim today's #1 spot!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Podium Showcase for Top 3 */}
              <div className="grid grid-cols-3 gap-2 pt-4 pb-2 items-end">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  {top3[1] ? (
                    <PodiumUser
                      item={top3[1]}
                      rank={2}
                      crownColor="text-slate-300"
                      ringColor="border-slate-300 shadow-slate-400/30"
                      height="h-28"
                    />
                  ) : (
                    <div className="h-28 flex items-center justify-center text-white/20 text-xs">--</div>
                  )}
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  {top3[0] ? (
                    <PodiumUser
                      item={top3[0]}
                      rank={1}
                      crownColor="text-amber-400 animate-bounce"
                      ringColor="border-amber-400 shadow-amber-400/50"
                      height="h-36"
                      isWinner
                    />
                  ) : null}
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  {top3[2] ? (
                    <PodiumUser
                      item={top3[2]}
                      rank={3}
                      crownColor="text-amber-700"
                      ringColor="border-amber-700 shadow-amber-800/30"
                      height="h-24"
                    />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-white/20 text-xs">--</div>
                  )}
                </div>
              </div>

              {/* Ranks 4+ List */}
              {rest.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase">
                    Rankings
                  </span>
                  {rest.map((item, idx) => (
                    <div
                      key={item.userId}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        currentUserId === item.userId
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-white/5 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center font-extrabold text-sm text-white/60">
                          {idx + 4}
                        </span>

                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-[#252033] shrink-0">
                          {item.avatar ? (
                            <img
                              src={getMediaUrl(item.avatar)}
                              alt={item.nickname}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white/60">
                              {item.nickname?.charAt(0) || 'H'}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h6 className="text-sm font-bold text-white truncate max-w-[120px]">
                            {item.nickname}
                          </h6>
                          <div className="flex items-center gap-2 text-[10px] text-white/50">
                            <span>{item.battlesCount} PK Battles</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">{item.wins} Wins</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-amber-300 tabular-nums">
                          {item.totalScore.toLocaleString()}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">
                          Daily Points
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Pinned: Current User's Rank */}
        {myRank && (
          <div className="px-5 py-3.5 bg-[#170e28] border-t border-white/10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-xs text-amber-300">
                {myRank.rank > 0 ? `#${myRank.rank}` : '--'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Your Daily PK Rank</p>
                <p className="text-[10px] text-white/50">
                  {myRank.battlesCount} Battles • {myRank.wins} Wins
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-amber-300 tabular-nums">
                {myRank.score.toLocaleString()}
              </span>
              <span className="block text-[9px] text-white/40 uppercase tracking-wider font-bold">
                Your Score
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

interface PodiumUserProps {
  item: DailyPkHost;
  rank: 1 | 2 | 3;
  crownColor: string;
  ringColor: string;
  height: string;
  isWinner?: boolean;
}

const PodiumUser: React.FC<PodiumUserProps> = ({
  item,
  rank,
  crownColor,
  ringColor,
  height,
  isWinner,
}) => {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Crown */}
      <Crown className={`w-5 h-5 mb-1 ${crownColor}`} />

      {/* Avatar with ring */}
      <div
        className={`relative ${
          isWinner ? 'w-16 h-16' : 'w-13 h-13'
        } rounded-full border-2 ${ringColor} shadow-lg overflow-hidden bg-[#252033] mb-1.5`}
      >
        {item.avatar ? (
          <img
            src={getMediaUrl(item.avatar)}
            alt={item.nickname}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-sm text-white/70">
            {item.nickname?.charAt(0) || 'H'}
          </div>
        )}

        <div className="absolute -bottom-1 inset-x-0 flex justify-center">
          <span
            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black text-white ${
              rank === 1
                ? 'bg-amber-500'
                : rank === 2
                ? 'bg-slate-400'
                : 'bg-amber-800'
            }`}
          >
            #{rank}
          </span>
        </div>
      </div>

      {/* Name */}
      <p className="text-xs font-bold text-white text-center truncate max-w-[85px]">
        {item.nickname}
      </p>

      {/* Points */}
      <div className="flex items-center gap-1 text-[11px] font-black text-amber-300 tabular-nums">
        <Flame className="w-3 h-3 text-orange-400" />
        {item.totalScore.toLocaleString()}
      </div>

      {/* Podium base bar */}
      <div
        className={`w-full ${height} mt-2 rounded-t-2xl flex flex-col items-center justify-center ${
          rank === 1
            ? 'bg-gradient-to-b from-amber-500/30 to-amber-600/10 border-t-2 border-amber-400/50'
            : rank === 2
            ? 'bg-gradient-to-b from-slate-400/20 to-slate-500/5 border-t-2 border-slate-300/40'
            : 'bg-gradient-to-b from-amber-800/20 to-amber-900/5 border-t-2 border-amber-700/40'
        }`}
      >
        <span className="text-lg font-black text-white/40">#{rank}</span>
        <span className="text-[9px] text-white/40 font-bold uppercase">{item.wins} Wins</span>
      </div>
    </div>
  );
};
