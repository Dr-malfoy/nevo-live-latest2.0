import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiSwordBold as Swords,
  PiUsersBold as Users,
  PiShuffleBold as Shuffle,
  PiMagnifyingGlassBold as Search,
  PiTimerBold as Timer,
  PiCircleNotchBold as Spinner,
  PiClockCountdownBold as CountdownIcon,
  PiFastForwardBold as SkipForward,
} from 'react-icons/pi';
import { pkApi, type LiveOpponentHost } from '../../api/pk.api';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

interface PKModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  onInviteSent?: (opponent: LiveOpponentHost, duration: number) => void;
  pkBattle?: any;
  socket?: any;
}

type TabType = 'friends' | 'random' | 'custom';

export const PKModal: React.FC<PKModalProps> = ({
  isOpen,
  onClose,
  streamId,
  onInviteSent,
  pkBattle,
  socket,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [tab, setTab] = useState<TabType>('friends');
  const [duration, setDuration] = useState<number>(180); // 3 minutes default (180s)
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Lists
  const [friends, setFriends] = useState<LiveOpponentHost[]>([]);
  const [randomHosts, setRandomHosts] = useState<LiveOpponentHost[]>([]);

  // Sequential Matchmaking Queue State
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchQueue, setMatchQueue] = useState<LiveOpponentHost[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  // Active Pending Host State (for either sequential matchmaking or single friend invite)
  const [pendingOpponent, setPendingOpponent] = useState<LiveOpponentHost | null>(null);
  const [pendingCountdown, setPendingCountdown] = useState<number>(12);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMatchmakingRef = useRef(false);
  const matchQueueRef = useRef<LiveOpponentHost[]>([]);
  const matchIndexRef = useRef(0);

  // Custom search
  const [searchUid, setSearchUid] = useState('');
  const [searchedHost, setSearchedHost] = useState<LiveOpponentHost | null>(null);
  const [searching, setSearching] = useState(false);

  // Clear timer safely
  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // Stop matchmaking completely
  const stopMatchmaking = useCallback(
    (reason?: string) => {
      clearCountdown();
      isMatchmakingRef.current = false;
      setIsMatchmaking(false);
      setPendingOpponent(null);
      setPendingCountdown(12);
      setMatchQueue([]);
      setMatchIndex(0);
      setInvitingId(null);
      if (reason) showToast(reason, 'info');
    },
    [clearCountdown, showToast]
  );

  // Fetch opponents when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopMatchmaking();
      return;
    }

    let active = true;
    setLoading(true);

    pkApi
      .getLiveOpponents(streamId)
      .then((res) => {
        if (!active) return;
        setFriends(res?.friends || []);
        setRandomHosts(res?.random || []);
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
  }, [isOpen, streamId, stopMatchmaking]);

  // Sequential matchmaking: challenge host at queue index
  const sendMatchRequestAtIndex = useCallback(
    async (index: number, queue?: LiveOpponentHost[]) => {
      if (!isMatchmakingRef.current) return;
      const targetQueue = queue || matchQueueRef.current;

      if (!targetQueue || index >= targetQueue.length) {
        stopMatchmaking('No opponents accepted this round. Please try again!');
        return;
      }

      const opponent = targetQueue[index];
      const hostId = opponent.userId || opponent.hostId;
      if (!hostId) {
        // Skip invalid host and try next
        sendMatchRequestAtIndex(index + 1, targetQueue);
        return;
      }

      matchIndexRef.current = index;
      setMatchIndex(index);
      setPendingOpponent(opponent);
      setPendingCountdown(12);
      clearCountdown();

      try {
        setInvitingId(hostId);
        await pkApi.inviteLivePk({
          inviterStreamId: streamId,
          targetHostId: hostId,
          targetStreamId: opponent.streamId,
          durationMinutes: Math.round(duration / 60),
        });
        showToast(
          `Challenging ${opponent.nickname || 'Host'} (${index + 1}/${targetQueue.length})...`,
          'info'
        );
        onInviteSent?.(opponent, duration);
      } catch (err: any) {
        console.warn('[Matchmaking] Invite failed for host', opponent.nickname, err);
        // Automatically advance to next host immediately
        sendMatchRequestAtIndex(index + 1, targetQueue);
        return;
      } finally {
        setInvitingId(null);
      }

      // Start 12s countdown timer for host response
      let timeLeft = 12;
      countdownTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setPendingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearCountdown();
          if (isMatchmakingRef.current) {
            showToast(
              `${opponent.nickname || 'Host'} did not respond. Trying next host...`,
              'info'
            );
            sendMatchRequestAtIndex(index + 1, targetQueue);
          }
        }
      }, 1000);
    },
    [streamId, duration, onInviteSent, showToast, clearCountdown, stopMatchmaking]
  );

  // Start automatic sequential matchmaking queue
  const handleStartRandomMatchmaking = () => {
    if (isMatchmaking) {
      stopMatchmaking('Matchmaking stopped');
      return;
    }

    if (randomHosts.length === 0) {
      showToast('No other live hosts available for random match right now', 'info');
      return;
    }

    // Shuffle live hosts randomly
    const shuffled = [...randomHosts].sort(() => Math.random() - 0.5);
    isMatchmakingRef.current = true;
    setIsMatchmaking(true);
    matchQueueRef.current = shuffled;
    setMatchQueue(shuffled);
    matchIndexRef.current = 0;
    setMatchIndex(0);

    sendMatchRequestAtIndex(0, shuffled);
  };

  // Skip immediately to next host in queue
  const handleSkipToNextHost = () => {
    if (!isMatchmakingRef.current) return;
    clearCountdown();
    showToast('Skipping to next host...', 'info');
    sendMatchRequestAtIndex(matchIndexRef.current + 1);
  };

  // Single host invite (from Friends tab or Custom UID tab)
  const handleSingleInvite = async (opponent: LiveOpponentHost) => {
    if (isMatchmaking) {
      showToast('Random matchmaking is active. Please cancel it first.', 'info');
      return;
    }
    if (pendingOpponent) {
      showToast('A challenge is already pending. Please wait or cancel it.', 'info');
      return;
    }

    const hostId = opponent.userId || opponent.hostId;
    if (!hostId) {
      showToast('Invalid host ID', 'error');
      return;
    }

    try {
      setInvitingId(hostId);
      await pkApi.inviteLivePk({
        inviterStreamId: streamId,
        targetHostId: hostId,
        targetStreamId: opponent.streamId,
        durationMinutes: Math.round(duration / 60),
      });

      setPendingOpponent(opponent);
      setPendingCountdown(15);
      showToast(`PK challenge sent to ${opponent.nickname || 'Host'}!`, 'success');
      onInviteSent?.(opponent, duration);

      clearCountdown();
      let timeLeft = 15;
      countdownTimerRef.current = setInterval(() => {
        timeLeft -= 1;
        setPendingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearCountdown();
          setPendingOpponent(null);
          showToast('No response from host. You can challenge again.', 'info');
        }
      }, 1000);
    } catch (err: any) {
      showToast(err?.message || 'Failed to send PK invitation', 'error');
      setPendingOpponent(null);
    } finally {
      setInvitingId(null);
    }
  };

  // Socket listeners for real-time declined / battle started
  useEffect(() => {
    if (!socket) return;

    const handleDeclined = (data: any) => {
      console.log('[PKModal] Received pk:live:declined event:', data);
      if (isMatchmakingRef.current) {
        showToast(
          `${pendingOpponent?.nickname || 'Host'} declined. Automatically trying next host...`,
          'info'
        );
        clearCountdown();
        sendMatchRequestAtIndex(matchIndexRef.current + 1);
      } else if (pendingOpponent) {
        clearCountdown();
        setPendingOpponent(null);
        showToast(`${pendingOpponent.nickname || 'Host'} declined the PK challenge.`, 'info');
      }
    };

    const handleBattleStart = () => {
      stopMatchmaking();
      onClose();
    };

    socket.on('pk:live:declined', handleDeclined);
    socket.on('pk:live:start', handleBattleStart);

    return () => {
      socket.off('pk:live:declined', handleDeclined);
      socket.off('pk:live:start', handleBattleStart);
    };
  }, [socket, pendingOpponent, showToast, clearCountdown, sendMatchRequestAtIndex, stopMatchmaking, onClose]);

  // When pkBattle starts, close modal
  useEffect(() => {
    if (pkBattle) {
      stopMatchmaking();
      onClose();
    }
  }, [pkBattle, stopMatchmaking, onClose]);

  // Handle Search Host by UID
  const handleSearch = async () => {
    const q = searchUid.trim();
    if (!q) return;
    setSearching(true);
    setSearchedHost(null);
    try {
      const res = await pkApi.searchHostByUid(q);
      if (res) {
        setSearchedHost(res);
      } else {
        showToast('No live host found with this UID', 'error');
      }
    } catch {
      showToast('Search failed. Please check the UID.', 'error');
    } finally {
      setSearching(false);
    }
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
        onClick={() => {
          stopMatchmaking();
          onClose();
        }}
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
            onClick={() => {
              stopMatchmaking();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Pending Challenge or Matchmaking Status Bar */}
        <AnimatePresence>
          {pendingOpponent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-purple-900/60 border-b border-purple-400/40 px-5 py-3 flex items-center justify-between gap-3 text-white overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-purple-400 bg-purple-950">
                    {pendingOpponent.avatar ? (
                      <img
                        src={getMediaUrl(pendingOpponent.avatar)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-purple-300">
                        {pendingOpponent.nickname?.charAt(0) || 'H'}
                      </div>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border border-black animate-ping" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {isMatchmaking
                      ? `Matching: Waiting for ${pendingOpponent.nickname || 'Host'}…`
                      : `Waiting for ${pendingOpponent.nickname || 'Host'} to accept…`}
                  </p>
                  <p className="text-[10px] text-purple-200/70 flex items-center gap-1">
                    <CountdownIcon className="w-3 h-3 text-amber-300" />
                    {isMatchmaking
                      ? `Auto-advances to next host in ${pendingCountdown}s`
                      : `Auto-cancels in ${pendingCountdown}s`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isMatchmaking && (
                  <button
                    type="button"
                    onClick={handleSkipToNextHost}
                    className="px-2.5 py-1 rounded-xl bg-purple-600/40 hover:bg-purple-600/70 text-purple-200 text-xs font-bold transition-all flex items-center gap-1"
                    title="Skip to next host"
                  >
                    <SkipForward className="w-3 h-3" />
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => stopMatchmaking('Challenge request cancelled')}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-red-500/30 text-white hover:text-red-200 border border-white/10 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              <span className="text-xs">Finding available live hosts…</span>
            </div>
          ) : tab === 'friends' ? (
            /* Friends Tab: ONLY followed friends who are currently streaming live! */
            friends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">No Friends Live Right Now</p>
                  <p className="text-xs text-white/40 mt-0.5 max-w-xs">
                    Only followed friends who are currently streaming live appear here.
                  </p>
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
                {friends.map((friend) => {
                  const fId = friend.userId || friend.hostId;
                  const isThisInviting =
                    invitingId === fId ||
                    (pendingOpponent &&
                      (pendingOpponent.userId === fId || pendingOpponent.hostId === fId));
                  return (
                    <OpponentCard
                      key={fId || friend.nickname}
                      opponent={friend}
                      inviting={Boolean(isThisInviting)}
                      disabled={Boolean(pendingOpponent && !isThisInviting)}
                      onInvite={() => handleSingleInvite(friend)}
                    />
                  );
                })}
              </div>
            )
          ) : tab === 'random' ? (
            /* Random Tab - Sequential Matchmaking Queue */
            <div className="flex flex-col items-center text-center py-4">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-xl shadow-purple-600/40 animate-pulse">
                  <Shuffle className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-pink-500 text-[10px] font-black uppercase text-white shadow">
                  1v1 Auto
                </span>
              </div>

              <h4 className="text-base font-extrabold text-white">Random 1v1 Battle</h4>
              <p className="text-xs text-white/50 max-w-xs mt-1 mb-5">
                Automatically challenges live hosts one-by-one. If one declines or times out, it moves
                to the next!
              </p>

              {isMatchmaking && pendingOpponent ? (
                <div className="w-full p-4 rounded-2xl bg-white/5 border border-purple-500/40 flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                      Auto Queue: {matchIndex + 1} of {matchQueue.length}
                    </span>
                    <span className="text-[11px] font-extrabold text-amber-300">
                      {pendingCountdown}s left
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-400 bg-purple-950 shrink-0">
                      {pendingOpponent.avatar ? (
                        <img
                          src={getMediaUrl(pendingOpponent.avatar)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-purple-300">
                          {pendingOpponent.nickname?.charAt(0) || 'H'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 text-left flex-1">
                      <h5 className="text-sm font-bold text-white truncate">
                        {pendingOpponent.nickname || 'Host'}
                      </h5>
                      <p className="text-[11px] text-purple-300 flex items-center gap-1 mt-0.5">
                        <Spinner className="w-3 h-3 animate-spin text-pink-400" />
                        Waiting for response… ({pendingCountdown}s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full pt-1">
                    <button
                      type="button"
                      onClick={handleSkipToNextHost}
                      className="flex-1 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/30 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip Host
                    </button>
                    <button
                      type="button"
                      onClick={() => stopMatchmaking('Matchmaking stopped')}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 border border-white/10 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartRandomMatchmaking}
                  disabled={loading || randomHosts.length === 0}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 active:scale-[0.98] transition-all font-black text-sm text-white shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Swords className="w-5 h-5" />
                  Find 1v1 Opponent ({randomHosts.length} Live Hosts)
                </button>
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
                  className="px-5 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  {searching ? <Spinner className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>

              {searchedHost && (
                <OpponentCard
                  opponent={searchedHost}
                  inviting={Boolean(
                    invitingId === (searchedHost.userId || searchedHost.hostId) ||
                      (pendingOpponent &&
                        (pendingOpponent.userId === (searchedHost.userId || searchedHost.hostId) ||
                          pendingOpponent.hostId === (searchedHost.userId || searchedHost.hostId)))
                  )}
                  disabled={Boolean(
                    pendingOpponent &&
                      pendingOpponent.userId !== (searchedHost.userId || searchedHost.hostId) &&
                      pendingOpponent.hostId !== (searchedHost.userId || searchedHost.hostId)
                  )}
                  onInvite={() => handleSingleInvite(searchedHost)}
                />
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

interface OpponentCardProps {
  opponent: LiveOpponentHost;
  inviting: boolean;
  disabled: boolean;
  onInvite: () => void;
}

const OpponentCard: React.FC<OpponentCardProps> = ({ opponent, inviting, disabled, onInvite }) => {
  const subtitle = opponent.title || opponent.streamTitle || 'Live Stream';

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-purple-500/30 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500/40 bg-purple-950">
            {opponent.avatar ? (
              <img
                src={getMediaUrl(opponent.avatar)}
                alt={opponent.nickname || 'Host'}
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
              {opponent.nickname || 'Host'}
            </h5>
            {typeof opponent.level === 'number' && opponent.level > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[9px] font-black text-white shrink-0">
                Lv.{opponent.level}
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/50 truncate max-w-[150px]">{subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onInvite}
        disabled={inviting || disabled}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 transition-all text-xs font-black text-white shadow-md shadow-purple-600/30 shrink-0 flex items-center gap-1 disabled:opacity-40"
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
