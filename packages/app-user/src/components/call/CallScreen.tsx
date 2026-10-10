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
  PiSpeakerHighFill as SpeakerIcon,
  PiWifiHighBold as WifiIcon,
  PiFastForwardFill as FastForwardIcon,
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
    playRemoteVideo,
    endCall,
  } = useCall();

  const { activeFilter, applyFilter } = useVideoFilters();

  const socket = useSocketStore((s) => s.socket);
  const joinCallRoom = useSocketStore((s) => s.joinCallRoom);
  const leaveCallRoom = useSocketStore((s) => s.leaveCallRoom);
  const currentUser = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [answering, setAnswering] = useState(Boolean(accepted));
  const [ringing, setRinging] = useState(!accepted && (!!incoming || !!outgoing));
  const [callConnected, setCallConnected] = useState(Boolean(accepted));
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

  // Join when session is known
  useEffect(() => {
    if (!session || (!answering && !outgoing && !accepted)) return;

    startCall({
      channel: session.channel,
      token: session.token,
      type: session.type,
      socket,
      callId: session.callId,
      currentUserId: currentUser?._id,
    })
      .then(() => {
        if (answering || accepted || outgoing) {
          setRinging(false);
          setCallConnected(true);
        }
      })
      .catch(() => {
        if (answering || accepted || outgoing) {
          setRinging(false);
          setCallConnected(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, answering, outgoing, accepted]);

  // Re-attach local preview if cameraOn changes to true
  useEffect(() => {
    if (joined && isVideo && cameraOn) {
      playLocalPreview();
    }
  }, [joined, isVideo, cameraOn, playLocalPreview]);

  // Callee accepted or remote track joined
  useEffect(() => {
    if (accepted || remoteUsers.length > 0) {
      setRinging(false);
      setCallConnected(true);
      setAnswering(true);
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

  // Billing heartbeat — audience only, priced calls only (fires every 60 s)
  useEffect(() => {
    if (!callConnected || !isAudience || coinsPerMinute <= 0 || !session?.callId) return;

    billingIntervalRef.current = setInterval(() => {
      if (!session?.callId || endedRef.current) return;
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
    }, 60_000);

    return () => {
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
        billingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callConnected, isAudience, coinsPerMinute, session?.callId]);

  // Incoming ringtone and vibration lifecycle
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

  const handleAccept = useCallback(async () => {
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
  }, [incoming, socket, currentUser?._id, startCall]);

  useEffect(() => {
    if (incoming && accepted && !answering && !callConnected) {
      handleAccept();
    }
  }, [incoming, accepted, answering, callConnected, handleAccept]);

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
      await callApi.end(session.callId, 'ended').catch(() => {});
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
  const floatingMessages = chatMessages.slice(-3);

  // Soundwave animation bars for Voice/Audio calls
  const waveBars = [
    { height: [12, 36, 18, 48, 24], duration: 1.1 },
    { height: [20, 52, 28, 64, 20], duration: 0.9 },
    { height: [14, 40, 20, 56, 16], duration: 1.2 },
    { height: [24, 60, 32, 72, 28], duration: 0.8 },
    { height: [18, 46, 22, 58, 20], duration: 1.0 },
    { height: [22, 54, 30, 68, 24], duration: 0.85 },
    { height: [12, 32, 16, 42, 14], duration: 1.15 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-neutral-950 text-white flex flex-col overflow-hidden select-none"
      role="dialog"
      aria-label={isVideo ? 'Video call' : 'Audio call'}
    >
      {/* 1. Underlying Video Canvas (Remote streams attach here) */}
      <div id="call-video-area" className="absolute inset-0 bg-neutral-950" />

      {/* 2. Fullscreen Remote Video Grid (Video Call mode) */}
      {joined && isVideo && remoteUsers.length > 0 && (
        <div className={`absolute inset-0 grid ${gridClass} gap-1 bg-black`}>
          {remoteUsers.map((uid, idx) => (
            <div key={String(uid)} className="relative w-full h-full bg-neutral-900 overflow-hidden flex items-center justify-center">
              <div
                id={`remote-container-${uid}`}
                ref={(el) => {
                  if (el) {
                    playRemoteVideo(uid, el);
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Remote user nameplate badge */}
              <div className="absolute bottom-24 sm:bottom-28 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white/95 max-w-[140px] truncate">
                    {remoteNames[idx] || `Host ${uid}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Audio Call Background (Deep cinematic mesh & live glowing waves) */}
      {(!isVideo || ringing || !callConnected || (isVideo && callConnected && remoteUsers.length === 0)) && (
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-neutral-900 via-neutral-950 to-black flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
          {/* Ambient decorative glowing orbs */}
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-pink-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Top header details inside audio screen */}
          <div className="flex flex-col items-center text-center space-y-3 mt-6 sm:mt-10 z-10">
            {/* Call type badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-xs font-semibold tracking-wide text-white/90 shadow-xl"
            >
              {isVideo ? (
                <>
                  <Video className="w-4 h-4 text-emerald-400" />
                  <span>1:1 Video Call</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 text-brand-primary" />
                  <span>1:1 Audio Voice Call</span>
                </>
              )}
            </motion.div>

            {/* Caller Name */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">
              {other?.nickname || 'Partner'}
            </h2>

            {/* Connection / Status indicator */}
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${callConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
              <p className="text-xs sm:text-sm text-white/70 font-medium tracking-wide">
                {!callConnected
                  ? incoming
                    ? 'Incoming call...'
                    : isTargetOnline
                    ? 'Ringing...'
                    : 'Calling...'
                  : `Connected · ${fmt(elapsed)}`}
              </p>
            </div>

            {/* Pricing badge if call is paid */}
            {coinsPerMinute > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/15 border border-amber-500/35 rounded-full text-xs font-bold text-amber-300 shadow-sm"
              >
                <CoinIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>{coinsPerMinute.toLocaleString()} Coins / min</span>
              </motion.div>
            )}
          </div>

          {/* Center Avatar with Pulsing Radar Rings & Sound Waveform */}
          <div className="relative flex flex-col items-center justify-center my-auto z-10">
            {/* Animated radar rings for ringing state */}
            {incoming && ringing && !callConnected && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.45, 1.9], opacity: [0.6, 0.25, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-brand-primary/30 border border-brand-primary/40 pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1.6], opacity: [0.7, 0.35, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                  className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-emerald-500/30 border border-emerald-400/40 pointer-events-none"
                />
              </>
            )}

            {/* Main Avatar Container */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative p-1.5 rounded-full bg-gradient-to-tr from-brand-primary/40 via-white/10 to-pink-500/40 backdrop-blur-2xl ring-2 ring-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <Avatar
                src={other?.avatar}
                nickname={other?.nickname || '?'}
                size="xl"
                className="w-28 h-28 sm:w-36 sm:h-36 text-3xl font-extrabold shadow-inner"
              />
            </motion.div>

            {/* Live Audio Equalizer Waveform Bars (Active when call is connected) */}
            {callConnected && !isVideo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 mt-8 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10"
              >
                <SpeakerIcon className="w-4 h-4 text-emerald-400 mr-1 shrink-0" />
                <div className="flex items-center gap-1 h-8">
                  {waveBars.map((bar, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        height: bar.height,
                      }}
                      transition={{
                        duration: bar.duration,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300"
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-emerald-300 ml-1.5 tracking-wider">
                  HD VOICE
                </span>
              </motion.div>
            )}
          </div>

          {/* Bottom spacer to prevent overlay collision */}
          <div className="h-28" />
        </div>
      )}

      {/* 4. Draggable Local Video Preview (PiP for Video Calls) */}
      <AnimatePresence>
        {joined && isVideo && (
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -300, right: 0, top: 0, bottom: 450 }}
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute top-16 right-4 z-30 w-32 sm:w-36 h-48 sm:h-52 rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/20 backdrop-blur-md cursor-grab active:cursor-grabbing group"
          >
            {cameraOn ? (
              <div
                id="call-local-video-container"
                className="w-full h-full relative object-cover"
                style={{ filter: activeFilter.css }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900/95 text-white/50 space-y-2 p-2 text-center">
                <VideoOff className="w-7 h-7 text-white/40" />
                <span className="text-[10px] font-semibold">Camera Off</span>
              </div>
            )}

            {/* PiP Header Tags & Flip camera shortcut */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/90 border border-white/10">
                You {activeFilter.id !== 'natural' && `· ${activeFilter.label}`}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  switchCamera();
                }}
                className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/10 shadow hover:scale-110 active:scale-95 transition-all"
                title="Flip Camera"
              >
                <CameraRotate className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Floating Top Bar Header (Status, Timer, Billing, Participants) */}
      {joined && (
        <header className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
          {/* Left: Call Timer Capsule */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 shadow-xl">
              <span className={`w-2.5 h-2.5 rounded-full ${callConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-xs font-bold text-white tracking-widest font-mono">
                {callConnected ? fmt(elapsed) : 'CONNECTING'}
              </span>
            </div>

            {/* Network HD Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[11px] font-semibold text-white/75">
              <WifiIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>HD</span>
            </div>
          </div>

          {/* Right: Coins Billing & Roster */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {isAudience && coinsPerMinute > 0 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 backdrop-blur-xl border border-amber-400/40 text-xs font-bold text-amber-300 shadow-lg"
              >
                <CoinIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="tabular-nums">{coinsPerMinute.toLocaleString()}/min</span>
              </motion.div>
            )}

            {roster.length > 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 text-xs text-white/80">
                <Users className="w-3.5 h-3.5" />
                <span>{roster.length}</span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* 6. Floating Heads-Up Live Messages Toast (When chat drawer is closed) */}
      {joined && !chatOpen && floatingMessages.length > 0 && (
        <div className="absolute bottom-28 left-4 z-20 max-w-[280px] sm:max-w-xs space-y-1.5 pointer-events-none">
          {floatingMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-black/70 backdrop-blur-xl rounded-2xl px-3.5 py-2 border border-white/15 shadow-xl text-xs flex items-start gap-2"
            >
              <Avatar
                src={msg.sender.avatar}
                nickname={msg.sender.nickname}
                size="xs"
                className="shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[10px] text-brand-secondary truncate">
                  {msg.sender._id === currentUser?._id ? 'You' : msg.sender.nickname}
                </p>
                <p className="text-white/95 text-xs break-words">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* 7. Beauty Filter Carousel Drawer (Video Calls) */}
      <AnimatePresence>
        {filterPickerOpen && isVideo && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            className="absolute bottom-28 inset-x-4 sm:max-w-md sm:mx-auto z-40 bg-neutral-900/90 backdrop-blur-2xl rounded-3xl p-4 border border-white/20 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-bold text-white tracking-wide">Video Filter Presets</h4>
              </div>
              <button
                onClick={() => setFilterPickerOpen(false)}
                className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {FILTERS.map((f) => {
                const isSelected = activeFilter.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => applyFilter(f.id)}
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500 to-brand-primary text-white border-transparent shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-105'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/15'
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

      {/* 8. Responsive In-Call Text Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-1/3 sm:top-1/4 sm:max-w-md sm:left-auto sm:right-6 z-40 bg-neutral-950/95 backdrop-blur-3xl rounded-t-3xl sm:rounded-3xl flex flex-col border border-white/15 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <ChatIcon className="w-4 h-4 text-brand-primary" />
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

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 text-xs text-center space-y-2 py-8">
                  <ChatIcon className="w-8 h-8 opacity-40" />
                  <p className="font-medium">No messages yet.</p>
                  <p className="text-[11px] text-white/30">Send a quick message during the call</p>
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
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-md ${
                          isMe
                            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-br-none'
                            : 'bg-neutral-800/90 text-white/95 border border-white/10 rounded-bl-none'
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
              className="p-3 border-t border-white/10 bg-neutral-900/90 flex items-center gap-2"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-800/90 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand-primary transition-colors"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                  messageText.trim()
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md hover:scale-105 active:scale-95'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Coins Finished Modal Overlay */}
      <CoinsFinishedOverlay
        visible={coinsFinished}
        onClose={() => {
          setCoinsFinished(false);
          onClose('ended');
        }}
      />

      {/* 10. Error notice bar */}
      {error && (
        <div className="absolute bottom-24 inset-x-0 z-30 flex justify-center px-6 pointer-events-none">
          <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-500/40 rounded-full px-4 py-2 backdrop-blur-xl shadow-lg">
            {error}
          </div>
        </div>
      )}

      {/* 11. Responsive Floating Bottom Control Dock */}
      <footer className="absolute bottom-6 sm:bottom-8 inset-x-0 z-30 flex items-center justify-center px-4 pointer-events-none">
        {incoming && ringing && !answering ? (
          /* Incoming Call Action Controls (Decline & Accept) */
          <div className="pointer-events-auto flex items-center justify-around w-full max-w-sm px-6 py-4 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl">
            {/* Decline Action */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleReject}
                aria-label="Decline call"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-700 shadow-[0_0_30px_rgba(244,63,94,0.5)] border border-rose-400/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs font-bold text-rose-400 tracking-wide">Decline</span>
            </div>

            {/* Accept Action */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleAccept}
                aria-label="Accept call"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_35px_rgba(16,185,129,0.7)] border border-emerald-300/50 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all animate-pulse"
              >
                <PhoneCall className="w-7 h-7" />
              </button>
              <span className="text-xs font-bold text-emerald-400 tracking-wide">Accept</span>
            </div>
          </div>
        ) : (
          /* Active / Dialing Call Control Dock */
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-5 py-3 rounded-full bg-neutral-950/70 backdrop-blur-2xl border border-white/15 shadow-2xl">
            {/* NEXT Match button (Random Match mode) */}
            {joined && onNext && (
              <button
                onClick={onNext}
                aria-label="Next match"
                className="h-11 sm:h-12 px-3.5 rounded-full flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all"
                title="Next match"
              >
                <span>NEXT</span>
                <FastForwardIcon className="w-4 h-4" />
              </button>
            )}

            {joined && (
              <>
                {/* 1. Chat Drawer Toggle */}
                <button
                  onClick={() => {
                    setChatOpen(!chatOpen);
                    setFilterPickerOpen(false);
                  }}
                  aria-label="Toggle text chat"
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                    chatOpen
                      ? 'bg-brand-primary text-white border-brand-primary shadow-[0_0_15px_rgba(99,102,241,0.5)]'
                      : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                  }`}
                  title="In-call chat"
                >
                  <ChatIcon className="w-5 h-5" />
                  {unreadChatCount > 0 && !chatOpen && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center animate-bounce shadow-md">
                      {unreadChatCount}
                    </span>
                  )}
                </button>

                {/* 2. Flip Camera (Video calls) */}
                {isVideo && (
                  <button
                    onClick={switchCamera}
                    aria-label="Flip camera"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 text-white/90 border border-white/10 hover:bg-white/20 active:scale-95 transition-all"
                    title="Flip camera"
                  >
                    <CameraRotate className="w-5 h-5" />
                  </button>
                )}

                {/* 3. Beauty Filter (Video calls) */}
                {isVideo && (
                  <button
                    onClick={() => {
                      setFilterPickerOpen(!filterPickerOpen);
                      setChatOpen(false);
                    }}
                    aria-label="Beauty filter"
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                      filterPickerOpen || activeFilter.id !== 'natural'
                        ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.6)]'
                        : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                    }`}
                    title="Beauty filters"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}

                {/* 4. Camera Toggle (Video calls) */}
                {isVideo && (
                  <button
                    onClick={toggleCamera}
                    aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                      cameraOn
                        ? 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    }`}
                    title={cameraOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}

                {/* 5. Microphone Toggle */}
                <button
                  onClick={toggleMic}
                  aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                    micOn
                      ? 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  }`}
                  title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* 6. End Call Button */}
            <button
              onClick={handleHangup}
              aria-label="End call"
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 shadow-[0_0_20px_rgba(225,29,72,0.6)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        )}
      </footer>
    </motion.div>
  );
};
