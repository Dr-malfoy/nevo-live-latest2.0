import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiPhoneSlashFill as PhoneOff,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiVideoCameraFill as Video,
  PiVideoCameraSlashFill as VideoOff,
  PiPhoneCallFill as PhoneCall,
  PiUsersFill as Users,
  PiChatDotsFill as ChatIcon,
  PiCameraRotateFill as CameraRotate,
  PiSparkleFill as Sparkles,
  PiPaperPlaneRightFill as SendIcon,
  PiXBold as X,
  PiCoinFill as CoinIcon,
} from 'react-icons/pi';
import { Avatar } from '../user';
import { useCall, type CallChatMessage } from '../../hooks/useCall';
import { useVideoFilters, FILTERS } from '../../hooks/useVideoFilters';
import { callApi, type CallParticipant } from '../../api/call.api';
import { useSocketStore, useAuthStore } from '../../stores';
import { CoinsFinishedOverlay } from './CoinsFinishedOverlay';
import { ringtone } from '../../lib/ringtone';


interface CallScreenProps {
  /** Incoming call payload (from socket) — callee answers with accept. */
  incoming?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    initiator: { nickname: string; avatar?: string } | null;
  };
  /** Outgoing call — caller dials and waits. */
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee?: { nickname: string; avatar?: string; online?: boolean } | null;
  };
  /** True when the callee accepted (server emits `call:accept`) — caller stops ringing. */
  accepted?: boolean;
  /** Optional in-call action (random-match "Next") — rendered as a skip button. */
  onNext?: () => void;
  onClose: (outcome?: 'ended' | 'rejected') => void;
  /** Coins per minute for priced 1:1 calls. 0 means free/group call. */
  coinsPerMinute?: number;
  /** Whether the current user is the paying audience member. */
  isAudience?: boolean;
}


interface RosterEntry extends CallParticipant {
  /** True when this user is not the local user (i.e., a remote member). */
  remote: boolean;
}

export const CallScreen = ({
  incoming,
  outgoing,
  accepted,
  onNext,
  onClose,
  coinsPerMinute = 0,
  isAudience = false,
}: CallScreenProps) => {
  const {
    joined,
    remoteUsers,
    micOn,
    cameraOn,
    error,
    startCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    playLocalPreview,
    endCall,
  } = useCall();

  const { activeFilter, applyFilter } = useVideoFilters();

  const socket = useSocketStore((s) => s.socket);
  const joinCallRoom = useSocketStore((s) => s.joinCallRoom);
  const leaveCallRoom = useSocketStore((s) => s.leaveCallRoom);
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [answering, setAnswering] = useState(false);
  const [ringing, setRinging] = useState(!!incoming || !!outgoing);
  const [callConnected, setCallConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const isTargetOnline = Boolean(
    outgoing?.callee?.online ??
    (outgoing?.callee as any)?.isOnline ??
    false
  );

  // Controls UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<CallChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Billing state (audience only)
  const [coinsFinished, setCoinsFinished] = useState(false);
  const [minutesBilled, setMinutesBilled] = useState(0);
  const billingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endedRef = useRef(false);
  const callIdRef = useRef<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);


  const session = incoming
    ? { callId: incoming.callId, channel: incoming.channel, type: incoming.type, token: incoming.token }
    : outgoing
      ? { callId: outgoing.callId, channel: outgoing.channel, type: outgoing.type, token: outgoing.token }
      : undefined;
  callIdRef.current = session?.callId || '';

  const other = incoming?.initiator || outgoing?.callee;
  const isVideo = incoming?.type === 'video' || outgoing?.type === 'video';

  // Join the per-call socket room once the call is known
  useEffect(() => {
    if (!session?.callId) return;
    joinCallRoom(session.callId);
    return () => leaveCallRoom(session.callId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId]);

  // Fetch the live roster when the call starts
  useEffect(() => {
    if (!session?.callId || !joined) return;
    callApi.get(session.callId)
      .then(({ data }) => {
        if (data.success && data.data?.participants) {
          const myId = currentUser?._id || '';
          setRoster(data.data.participants.map((p) => ({ ...p, remote: p._id !== myId })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, joined]);

  // Handle incoming live chat messages and socket events
  useEffect(() => {
    if (!socket || !session?.callId) return;

    const onMemberJoined = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      const myId = currentUser?._id || '';
      if (payload?.userId && payload.userId !== myId) {
        setRinging(false);
        setCallConnected(true);
      }
      setRoster((prev) => {
        if (!payload?.userId || prev.some((p) => p._id === payload.userId)) return prev;
        return [
          ...prev,
          {
            _id: payload.userId,
            nickname: payload.nickname || 'User',
            avatar: payload.avatar,
            remote: payload.userId !== myId,
          },
        ];
      });
    };

    const onMemberLeft = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setRoster((prev) => prev.filter((p) => p._id !== payload?.userId));
    };

    const onCallAccept = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setRinging(false);
      setCallConnected(true);
    };

    const onCallEnded = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      if (!endedRef.current) {
        endedRef.current = true;
        endCall().finally(() => onClose('ended'));
      }
    };

    const onCallMessage = (msg: CallChatMessage) => {
      if (msg.callId !== session.callId) return;
      setChatMessages((prev) => [...prev, msg]);
      if (!chatOpen) {
        setUnreadChatCount((c) => c + 1);
      }
    };

    socket.on('call:member-joined', onMemberJoined);
    socket.on('call:member-left', onMemberLeft);
    socket.on('call:accept', onCallAccept);
    socket.on('call:end', onCallEnded);
    socket.on('call:message', onCallMessage);

    // Audience-only: handle server-pushed coins-finished event
    const onCoinsFinished = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setCoinsFinished(true);
      // Call is already ended server-side; clean up Agora
      if (!endedRef.current) {
        endedRef.current = true;
        endCall().catch(() => {});
      }
    };
    socket.on('call:coins-finished', onCoinsFinished);

    // Also listen for balance updates from billing ticks
    const onBalanceUpdate = (payload: any) => {
      if (payload?.coins != null) {
        updateUser({ coins: payload.coins });
      }
      if (payload?.minutesBilled != null) {
        setMinutesBilled(payload.minutesBilled);
      }
    };
    socket.on('balance:update', onBalanceUpdate);

    return () => {
      socket.off('call:member-joined', onMemberJoined);
      socket.off('call:member-left', onMemberLeft);
      socket.off('call:accept', onCallAccept);
      socket.off('call:end', onCallEnded);
      socket.off('call:message', onCallMessage);
      socket.off('call:coins-finished', onCoinsFinished);
      socket.off('balance:update', onBalanceUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, session?.callId, chatOpen]);


  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatOpen) {
      setUnreadChatCount(0);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Join when session is known (outgoing joins immediately; incoming after answering).
  useEffect(() => {
    if (!session || (!answering && !outgoing)) return;

    startCall({
      channel: session.channel,
      token: session.token,
      type: session.type,
      socket,
      callId: session.callId,
      currentUserId: currentUser?._id,
    })
      .then(() => {
        if (answering) {
          setRinging(false);
          setCallConnected(true);
        }
      })
      .catch(() => {
        if (answering) {
          setRinging(false);
          setCallConnected(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, answering]);

  // Re-attach local preview if cameraOn changes to true
  useEffect(() => {
    if (joined && isVideo && cameraOn) {
      playLocalPreview();
    }
  }, [joined, isVideo, cameraOn, playLocalPreview]);

  // Callee accepted or remote track joined → the outgoing caller stops ringing and connects call
  useEffect(() => {
    if (accepted || remoteUsers.length > 0) {
      setRinging(false);
      setCallConnected(true);
    }
  }, [accepted, remoteUsers.length]);

  // Call duration timer — ONLY counts after other user has picked up / connected
  useEffect(() => {
    if (!callConnected) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [callConnected]);

  /**
   * Billing heartbeat — audience only, priced calls only.
   * Fires every 60 s to trigger a server-side coin deduction.
   * Only active after call is connected.
   */
  useEffect(() => {
    if (!callConnected || !isAudience || coinsPerMinute <= 0 || !session?.callId) return;

    // Fire first tick immediately at 60 s (handled by setInterval below).
    billingIntervalRef.current = setInterval(() => {
      if (!session?.callId || endedRef.current) return;
      // Socket-based heartbeat
      socket?.emit('call:billing-tick', { callId: session.callId }, (res: any) => {
        if (res?.result?.coinsFinished) {
          setCoinsFinished(true);
        }
        if (res?.result?.minutesBilled != null) {
          setMinutesBilled(res.result.minutesBilled);
        }
        if (res?.result?.audienceCoins != null) {
          updateUser({ coins: res.result.audienceCoins });
        }
      });
    }, 60_000); // 60 seconds

    return () => {
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
        billingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callConnected, isAudience, coinsPerMinute, session?.callId]);

  // Incoming ringtone and vibration lifecycle with 45s timeout
  useEffect(() => {
    if (incoming && ringing && !callConnected) {
      ringtone.start();
      const timeout = setTimeout(() => {
        if (!callConnected && !endedRef.current) {
          handleReject();
        }
      }, 45000);
      return () => {
        clearTimeout(timeout);
        ringtone.stop();
      };
    } else {
      ringtone.stop();
    }
    return () => {
      ringtone.stop();
    };
  }, [incoming, ringing, callConnected]);

  const handleAccept = async () => {
    if (!incoming) return;
    ringtone.stop();
    try {
      setAnswering(true);
      setRinging(false);
      setCallConnected(true);
      const { data } = await callApi.accept(incoming.callId);
      if (data.success && data.data) {
        startCall({
          channel: data.data.channel,
          token: data.data.token,
          type: data.data.type,
          socket,
          callId: incoming.callId,
          currentUserId: currentUser?._id,
        }).catch(() => {});
      }
    } catch {
      setAnswering(true);
      setRinging(false);
      setCallConnected(true);
    }
  };

  const handleReject = async () => {
    ringtone.stop();
    if (endedRef.current) return;
    endedRef.current = true;
    if (incoming) await callApi.end(incoming.callId, 'rejected').catch(() => {});
    await endCall();
    onClose('rejected');
  };

  const handleHangup = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (session) {
      // End the call on the server (also triggers billing finalization server-side)
      await callApi.end(session.callId, 'ended').catch(() => {});
      // Belt-and-suspenders: also call finalize explicitly for priced calls
      if (isAudience && coinsPerMinute > 0) {
        callApi.finalize(session.callId).catch(() => {});
      }
    }
    await endCall();
    onClose('ended');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, isAudience, coinsPerMinute]);


  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() || !session?.callId || !socket) return;

    const newMsg: CallChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      callId: session.callId,
      senderId: currentUser?._id || '',
      sender: {
        _id: currentUser?._id,
        nickname: currentUser?.nickname || 'Me',
        avatar: currentUser?.avatar,
      },
      text: messageText.trim(),
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socket.emit('call:message', {
      callId: session.callId,
      text: messageText.trim(),
      sender: newMsg.sender,
    });
    setMessageText('');
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const gridClass =
    remoteUsers.length <= 1 ? 'grid-cols-1' :
    remoteUsers.length <= 4 ? 'grid-cols-2' :
    'grid-cols-3';

  const remoteNames = roster.filter((r) => r.remote).map((r) => r.nickname);

  // Recent floating messages (last 3 messages) for in-call heads-up display
  const floatingMessages = chatMessages.slice(-3);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col overflow-hidden"
      role="dialog"
      aria-label={isVideo ? 'Video call' : 'Audio call'}
    >
      {/* Video area — remote video tiles render here */}
      <div id="call-video-area" className="absolute inset-0 bg-neutral-950" />

      {/* Remote video grid (video calls) */}
      {joined && isVideo && remoteUsers.length > 0 && (
        <div className={`absolute inset-0 grid ${gridClass} gap-0.5`}>
          {remoteUsers.map((uid) => (
            <div key={String(uid)} className="relative bg-black/40 min-h-0 min-w-0">
              <div id={`remote-container-${uid}`} className="absolute inset-0 w-full h-full" />
              <span className="absolute bottom-2 left-2 text-xs font-medium text-white/90 bg-black/60 backdrop-blur-md rounded-lg px-2.5 py-1 pointer-events-none border border-white/10">
                {remoteNames[remoteUsers.indexOf(uid)] || `Member ${uid}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Local preview (video calls) — small PiP */}
      <AnimatePresence>
        {joined && isVideo && cameraOn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-4 right-4 w-28 sm:w-32 h-40 sm:h-44 rounded-2xl overflow-hidden border border-white/20 z-20 shadow-2xl bg-dark-900"
          >
            {/* The local video container applies CSS beauty filter styling smoothly */}
            <div
              id="call-local-video-container"
              className="w-full h-full relative"
              style={{ filter: activeFilter.css }}
            />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white/90">
              You {activeFilter.id !== 'natural' && `· ${activeFilter.label}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Information (Timer & Participant Info) */}
      {joined && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          {callConnected ? (
            <div className="glass-chip px-3 py-1.5 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-bold text-white tracking-wider">{fmt(elapsed)}</span>
            </div>
          ) : (
            <div className="glass-chip px-3 py-1.5 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/90 tracking-wide">
                {incoming ? 'Incoming...' : isTargetOnline ? 'Ringing...' : 'Calling...'}
              </span>
            </div>
          )}
          {/* Billing info chip — audience only, priced calls */}
          {isAudience && coinsPerMinute > 0 && (
            <div className="glass-chip px-2.5 py-1.5 flex items-center gap-1.5 bg-amber-500/80 backdrop-blur-md rounded-full border border-amber-400/50 text-xs text-white font-semibold">
              <CoinIcon className="w-3.5 h-3.5" />
              <span>{coinsPerMinute.toLocaleString()}/min</span>
            </div>
          )}
          {roster.length > 0 && (
            <div className="glass-chip px-2.5 py-1.5 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/15 text-xs text-white/80">
              <Users className="w-3.5 h-3.5" />
              <span>{roster.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Coins Finished overlay — shown when audience runs out of coins mid-call */}
      <CoinsFinishedOverlay
        visible={coinsFinished}
        onClose={() => {
          setCoinsFinished(false);
          onClose('ended');
        }}
      />

      {/* Incoming Call / Ringing Backdrop */}
      {(ringing || !isVideo || !callConnected) && (
        <div className="absolute inset-0 z-[1] bg-mesh flex flex-col items-center justify-between py-16 px-6">
          {/* Top Call Info */}
          <div className="flex flex-col items-center text-center space-y-3 mt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
              {isVideo ? (
                <>
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span>Incoming Video Call</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 text-brand-primary" />
                  <span>Incoming Audio Call</span>
                </>
              )}
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
              {other?.nickname || 'User'}
            </h2>

            <p className="text-sm text-white/70 font-medium">
              {!callConnected
                ? incoming
                  ? isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'
                  : isTargetOnline
                  ? 'Ringing...'
                  : 'Calling...'
                : error || fmt(elapsed)}
            </p>

            {coinsPerMinute > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-xs font-semibold text-amber-300">
                <CoinIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{coinsPerMinute.toLocaleString()} Coins / min</span>
              </div>
            )}
          </div>

          {/* Center Avatar with Pulsing Rings */}
          <div className="relative flex items-center justify-center my-auto">
            {incoming && ringing && !callConnected && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-36 h-36 rounded-full bg-brand-primary/30 border border-brand-primary/40 pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1.5], opacity: [0.8, 0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                  className="absolute w-36 h-36 rounded-full bg-emerald-500/30 border border-emerald-400/40 pointer-events-none"
                />
              </>
            )}

            <div className="relative rounded-full ring-4 ring-white/20 shadow-2xl p-1 bg-black/40 backdrop-blur-sm">
              <Avatar
                src={other?.avatar}
                nickname={other?.nickname || '?'}
                size="xl"
                className="w-28 h-28 sm:w-32 sm:h-32 text-2xl font-bold"
              />
            </div>
          </div>

          {/* Spacer for bottom controls */}
          <div className="h-24" />
        </div>
      )}

      {/* Floating in-call chat overlay (when chat drawer is closed) */}
      {joined && !chatOpen && floatingMessages.length > 0 && (
        <div className="absolute bottom-28 left-4 z-20 max-w-[280px] sm:max-w-xs space-y-1.5 pointer-events-none">
          {floatingMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-black/65 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/10 shadow-lg text-xs"
            >
              <span className="font-bold text-brand-secondary mr-1.5">
                {msg.sender._id === currentUser?._id ? 'You' : msg.sender.nickname}:
              </span>
              <span className="text-white/90">{msg.text}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Beauty Filter Picker Sheet */}
      <AnimatePresence>
        {filterPickerOpen && isVideo && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-28 inset-x-4 sm:max-w-md sm:mx-auto z-30 bg-dark-900/90 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-bold text-white">Beauty Filters</h4>
              </div>
              <button
                onClick={() => setFilterPickerOpen(false)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FILTERS.map((f) => {
                const isSelected = activeFilter.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => applyFilter(f.id)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-transparent shadow-glow-sm scale-105'
                        : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/15'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-Call Text Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="absolute inset-x-0 bottom-0 top-1/3 sm:top-1/4 z-40 bg-dark-950/95 backdrop-blur-2xl rounded-t-3xl flex flex-col border-t border-white/15 shadow-2xl"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ChatIcon className="w-5 h-5 text-brand-primary" />
                <h3 className="font-bold text-sm text-white">Call Messages</h3>
                <span className="text-xs text-white/50">({chatMessages.length})</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 text-xs text-center">
                  <ChatIcon className="w-8 h-8 mb-2 opacity-50" />
                  <p>No messages yet.</p>
                  <p>Say hello to everyone in the call!</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser?._id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <Avatar
                          src={msg.sender.avatar}
                          nickname={msg.sender.nickname}
                          size="xs"
                          className="shrink-0 mb-1"
                        />
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs ${
                          isMe
                            ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white rounded-br-none shadow-glow-sm'
                            : 'bg-dark-800/90 text-white/90 border border-white/10 rounded-bl-none'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-bold text-brand-secondary mb-0.5">
                            {msg.sender.nickname}
                          </p>
                        )}
                        <p className="break-words leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat input box */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-white/10 bg-dark-900/80 flex items-center gap-2"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-dark-800/90 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand-primary transition-colors"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                  messageText.trim()
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-glow-sm hover:scale-105 active:scale-95'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <div className="absolute bottom-24 inset-x-0 z-20 flex justify-center px-6 pointer-events-none">
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2 backdrop-blur-md">
            {error}
          </p>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-8 inset-x-0 z-30 flex items-center justify-center gap-3 sm:gap-4 px-4">
        {incoming && ringing && !answering ? (
          <div className="flex items-center justify-around w-full max-w-xs px-4">
            {/* Decline Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleReject}
                aria-label="Decline call"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_30px_rgba(239,68,68,0.5)] border border-red-400/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs font-bold text-red-400">Decline</span>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                aria-label="Accept call"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.7)] border border-emerald-300/50 flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-pulse"
              >
                <PhoneCall className="w-7 h-7 text-white" />
              </button>
              <span className="text-xs font-bold text-emerald-400">Accept</span>
            </div>
          </div>
        ) : (
          <>
            {/* NEXT Match button */}
            {joined && onNext && (
              <button
                onClick={onNext}
                aria-label="Next match"
                className="w-11 h-11 rounded-full glass-chip flex items-center justify-center text-[10px] font-black tracking-wider bg-white/10 hover:bg-white/20 border border-white/20 text-white active:scale-95 transition-all shadow-md"
                title="Next match"
              >
                NEXT
              </button>
            )}

            {joined && (
              <>
                {/* 1. Text Chat Toggle */}
                <button
                  onClick={() => {
                    setChatOpen(!chatOpen);
                    setFilterPickerOpen(false);
                  }}
                  aria-label="Toggle text chat"
                  className={`relative w-11 h-11 rounded-full glass-chip flex items-center justify-center transition-all border ${
                    chatOpen
                      ? 'bg-brand-primary text-white border-brand-primary shadow-glow-sm'
                      : 'bg-black/50 text-white/90 border-white/15 hover:bg-white/15'
                  }`}
                  title="Text Chat"
                >
                  <ChatIcon className="w-5 h-5" />
                  {unreadChatCount > 0 && !chatOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </button>

                {/* 2. Flip Camera Toggle (Video Calls) */}
                {isVideo && (
                  <button
                    onClick={switchCamera}
                    aria-label="Flip camera"
                    className="w-11 h-11 rounded-full glass-chip flex items-center justify-center bg-black/50 text-white/90 border border-white/15 hover:bg-white/15 active:scale-95 transition-all"
                    title="Flip Camera"
                  >
                    <CameraRotate className="w-5 h-5" />
                  </button>
                )}

                {/* 3. Beauty Filter Toggle (Video Calls) */}
                {isVideo && (
                  <button
                    onClick={() => {
                      setFilterPickerOpen(!filterPickerOpen);
                      setChatOpen(false);
                    }}
                    aria-label="Beauty filter"
                    className={`w-11 h-11 rounded-full glass-chip flex items-center justify-center transition-all border ${
                      filterPickerOpen || activeFilter.id !== 'natural'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.5)]'
                        : 'bg-black/50 text-white/90 border-white/15 hover:bg-white/15'
                    }`}
                    title="Beauty Filter"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}

                {/* 4. Camera On/Off Toggle (Video Calls) */}
                {isVideo && (
                  <button
                    onClick={toggleCamera}
                    aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    className={`w-11 h-11 rounded-full glass-chip flex items-center justify-center transition-all border ${
                      cameraOn
                        ? 'bg-black/50 text-white/90 border-white/15 hover:bg-white/15'
                        : 'bg-red-500/30 text-red-400 border-red-500/50'
                    }`}
                    title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}

                {/* 5. Microphone On/Off Toggle */}
                <button
                  onClick={toggleMic}
                  aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                  className={`w-11 h-11 rounded-full glass-chip flex items-center justify-center transition-all border ${
                    micOn
                      ? 'bg-black/50 text-white/90 border-white/15 hover:bg-white/15'
                      : 'bg-red-500/30 text-red-400 border-red-500/50'
                  }`}
                  title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* Hangup / End call button */}
            <button
              onClick={handleHangup}
              aria-label="End call"
              className="w-13 h-13 rounded-full bg-gradient-to-br from-red-500 to-red-700 btn-glow-pink flex items-center justify-center p-3.5 hover:scale-105 active:scale-95 transition-transform"
              title="End call"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
