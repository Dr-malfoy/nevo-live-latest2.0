import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiSwordBold as Swords,
  PiUsersBold as Users,
  PiShuffleBold as Shuffle,
  PiMagnifyingGlassBold as Search,
  PiTimerBold as Timer,
  PiCircleNotchBold as Spinner,
  PiCrownFill as Crown,
  PiBroadcastFill as Broadcast,
  PiCheckBold as Check,
} from 'react-icons/pi';
import { pkApi, type LiveOpponent } from '../../api/pk.api';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

interface PKModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  onInviteSent?: (opponent: LiveOpponent, duration: number) => void;
}

type TabType = 'friends' | 'random' | 'custom';

export const PKModal: React.FC<PKModalProps> = ({
  isOpen,
  onClose,
  streamId,
  onInviteSent,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [tab, setTab] = useState<TabType>('friends');
  const [duration, setDuration] = useState<number>(180); // 3 minutes default (180s)
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Lists
  const [friends, setFriends] = useState<LiveOpponent[]>([]);
  const [randomHosts, setRandomHosts] = useState<LiveOpponent[]>([]);

  // Custom search
  const [searchUid, setSearchUid] = useState('');
  const [searchedHost, setSearchedHost] = useState<LiveOpponent | null>(null);
  const [searching, setSearching] = useState(false);

  // Fetch opponents when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    pkApi
      .getLiveOpponents(streamId)
      .then((res) => {
        if (!active) return;
        setFriends(res.friends || []);
        setRandomHosts(res.random || []);
      })
      .catch((err) => {
        console.error('Failed to load PK opponents:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, streamId]);

  // Handle Search Host
  const handleSearch = async () => {
    if (!searchUid.trim()) return;
    setSearching(true);
    setSearchedHost(null);
    try {
      const res = await pkApi.searchHostByUid(searchUid.trim());
      if (res) {
        setSearchedHost(res);
      } else {
        showToast('No live host found with this UID', 'error');
      }
    } catch {
      showToast('Search failed. Please try again', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Handle Invite Host
  const handleInvite = async (opponent: LiveOpponent) => {
    if (!opponent.streamId) {
      showToast('This host is not currently live', 'error');
      return;
    }

    try {
      setInvitingId(opponent.userId);
      await pkApi.inviteLivePk({
        fromStreamId: streamId,
        toHostId: opponent.userId,
        toStreamId: opponent.streamId,
        durationSeconds: duration,
      });

      showToast(`PK Battle invitation sent to ${opponent.nickname}!`, 'success');
      onInviteSent?.(opponent, duration);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send PK invitation', 'error');
    } finally {
      setInvitingId(null);
    }
  };

  // Handle Random Quick Match
  const handleRandomMatch = () => {
    if (randomHosts.length === 0) {
      showToast('No other hosts available for random match right now', 'info');
      return;
    }
    const randomIndex = Math.floor(Math.random() * randomHosts.length);
    handleInvite(randomHosts[randomIndex]);
  };

  if (!isOpen) return null;

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
        className="relative w-full max-w-lg bg-gradient-to-b from-[#1c142c] via-[#120f1e] to-[#0a0712] border-t border-purple-500/30 rounded-t-[28px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(147,51,234,0.25)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white flex items-center gap-1.5">
                PK BATTLE MATCH
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30 uppercase">
                  1v1 Live
                </span>
              </h3>
              <p className="text-[11px] text-white/50">Challenge another host to a real-time gift battle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duration Selector */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 shrink-0 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-purple-400" /> Battle Duration
            </span>
            <span className="text-[11px] text-purple-300 font-bold">
              {Math.floor(duration / 60)} {duration === 60 ? 'Minute' : 'Minutes'}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '1 Min', val: 60 },
              { label: '3 Min', val: 180 },
              { label: '5 Min', val: 300 },
              { label: '10 Min', val: 600 },
            ].map((d) => (
              <button
                key={d.val}
                type="button"
                onClick={() => setDuration(d.val)}
                className={`py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  duration === d.val
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-pink-400/50 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs: Friends / Random / Custom */}
        <div className="flex items-center px-5 pt-3 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setTab('friends')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
              tab === 'friends'
                ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Friends ({friends.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('random')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
              tab === 'random'
                ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            Random
          </button>

          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
              tab === 'custom'
                ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                : 'bg-white/5 border-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Custom UID
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-white/50">
              <Spinner className="w-6 h-6 animate-spin text-purple-400" />
              <span className="text-xs">Finding available hosts…</span>
            </div>
          ) : tab === 'friends' ? (
            /* Friends Tab */
            friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">No Friends Live Right Now</p>
                  <p className="text-xs text-white/40 mt-0.5">Try Random Matchmaking or enter a host's User ID</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('random')}
                  className="mt-1 px-4 py-1.5 rounded-full bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-bold text-purple-200 transition-colors"
                >
                  Go to Random Match
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {friends.map((friend) => (
                  <OpponentCard
                    key={friend.userId}
                    opponent={friend}
                    inviting={invitingId === friend.userId}
                    onInvite={() => handleInvite(friend)}
                  />
                ))}
              </div>
            )
          ) : tab === 'random' ? (
            /* Random Tab */
            <div className="flex flex-col items-center text-center py-4">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-600/40 animate-pulse">
                  <Shuffle className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-black uppercase text-white shadow">
                  Instant
                </span>
              </div>

              <h4 className="text-base font-extrabold text-white">Random 1v1 Battle</h4>
              <p className="text-xs text-white/50 max-w-xs mt-1 mb-5">
                Match with any currently live host across the platform. Both of your audiences will be linked!
              </p>

              <button
                type="button"
                onClick={handleRandomMatch}
                disabled={loading || randomHosts.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 active:scale-[0.98] transition-all font-black text-sm text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Swords className="w-5 h-5" />
                Start Random Match ({randomHosts.length} Online)
              </button>

              {randomHosts.length > 0 && (
                <div className="w-full mt-6 text-left">
                  <span className="text-[11px] font-bold text-white/50 tracking-wider uppercase mb-2 block">
                    Online Live Hosts
                  </span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {randomHosts.slice(0, 5).map((host) => (
                      <OpponentCard
                        key={host.userId}
                        opponent={host}
                        inviting={invitingId === host.userId}
                        onInvite={() => handleInvite(host)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom UID Tab */
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchUid}
                    onChange={(e) => setSearchUid(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter Host User ID / UID…"
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/15 focus:border-purple-500 focus:outline-none text-sm text-white placeholder-white/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchUid.trim()}
                  className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 transition-colors font-bold text-xs text-white flex items-center gap-1.5 shrink-0"
                >
                  {searching ? (
                    <Spinner className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" /> Search
                    </>
                  )}
                </button>
              </div>

              {searchedHost ? (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-purple-300 tracking-wider uppercase mb-2 block">
                    Host Found
                  </span>
                  <OpponentCard
                    opponent={searchedHost}
                    inviting={invitingId === searchedHost.userId}
                    onInvite={() => handleInvite(searchedHost)}
                  />
                </div>
              ) : (
                <div className="py-8 text-center text-white/40 text-xs">
                  Enter the unique User ID (UID) of any currently streaming host to challenge them.
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface OpponentCardProps {
  opponent: LiveOpponent;
  inviting: boolean;
  onInvite: () => void;
}

const OpponentCard: React.FC<OpponentCardProps> = ({
  opponent,
  inviting,
  onInvite,
}) => {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500/50 bg-[#252033]">
            {opponent.avatar ? (
              <img
                src={getMediaUrl(opponent.avatar)}
                alt={opponent.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-base text-purple-300">
                {opponent.nickname?.charAt(0) || 'H'}
              </div>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 px-1 rounded-full bg-red-600 text-[8px] font-black uppercase text-white shadow-sm flex items-center gap-0.5">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h5 className="text-sm font-bold text-white truncate max-w-[130px]">
              {opponent.nickname}
            </h5>
            {opponent.level && (
              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-black text-white shrink-0">
                Lv.{opponent.level}
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/50 truncate max-w-[150px]">
            {opponent.streamTitle || `UID: ${opponent.userId.slice(-6)}`}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onInvite}
        disabled={inviting}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 transition-all text-xs font-black text-white shadow-md shadow-purple-600/30 shrink-0 flex items-center gap-1 disabled:opacity-50"
      >
        {inviting ? (
          <Spinner className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Swords className="w-3.5 h-3.5" /> PK
          </>
        )}
      </button>
    </div>
  );
};
