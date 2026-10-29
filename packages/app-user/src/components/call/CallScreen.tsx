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
  PiSpeakerHighFill as SpeakerIcon,
  PiSpeakerSlashFill as SpeakerSlashIcon,
  PiFlipHorizontalFill as MirrorIcon,
  PiWifiHighBold as WifiIcon,
  PiWifiSlashBold as WifiSlashIcon,
  PiFastForwardFill as FastForwardIcon,
  PiShieldCheckFill as ShieldCheck,
  PiSmileyFill as SmileyIcon,
} from 'react-icons/pi';
import { Avatar } from '../user';
import { DiamondIcon } from '../ui/CurrencyIcon';
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
    isFreeMinuteApplied?: boolean;
  };
  /** Outgoing call — caller dials and waits. */
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee?: { nickname: string; avatar?: string; online?: boolean } | null;
    isFreeMinuteApplied?: boolean;
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
  /** Whether 1st minute free (1:1 Subscription VIP) is applied */
  isFreeMinuteApplied?: boolean;
}

interface RosterEntry extends CallParticipant {
  remote: boolean;
}

const QUICK_CHAT_PRESETS = [
  'Hey there! 👋',
  'Nice to meet you! ✨',
  'Where are you from? 🌍',
  'You look great! 💖',
];

export const CallScreen = ({
  incoming,
  outgoing,
  accepted,
  onNext,
  onClose,
  coinsPerMinute = 0,
  isAudience = false,
  isFreeMinuteApplied,
}: CallScreenProps) => {
  const {
    joined,
    remoteUsers,
    micOn,
    cameraOn,
    speakerOn,
    mirrorOn,
    facingMode,
    connectionState,
    error,
    startCall,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleMirror,
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

  const [isTargetOnline, setIsTargetOnline] = useState<boolean>(() =>
    Boolean(
      outgoing?.callee?.online ??
      (outgoing?.callee as any)?.isOnline ??
      false
    )
  );

  useEffect(() => {
    if (outgoing?.callee?.online != null) {
      setIsTargetOnline(Boolean(outgoing.callee.online));
    }
  }, [outgoing?.callee?.online]);

  useEffect(() => {
    return () => {
      ringtone.stop();
      try {
        (window as any).NevoNativeBridge?.stopRingtone?.();
      } catch {}
    };
  }, []);

  // Controls UI state
  const [chatOpen, setChatOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<CallChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Billing state (audience only)
  const [coinsFinished, setCoinsFinished] = useState(false);
  const [_minutesBilled, setMinutesBilled] = useState(0);
  const [isLowBalance, setIsLowBalance] = useState(false);
  const [_minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const billingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endedRef = useRef(false);
  const callIdRef = useRef<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Network grace: 30-second reconnect countdown
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(30);
  const [reconnectNotice, setReconnectNotice] = useState<string>('');
  const [connectionRestoredNotice, setConnectionRestoredNotice] = useState(false);

  const networkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isReconnectingRef = useRef(false);

  const handleNetworkLost = useCallback((reason: string = 'Internet connection lost') => {
    // If already in 30s grace reconnecting mode, don't restart timer
    if (networkTimerRef.current || isReconnectingRef.current) return;

    // Only start 30s grace if the call was already connected or joined
    if (!joined && !callConnected) return;

    isReconnectingRef.current = true;
    setIsReconnecting(true);
    setReconnectCountdown(30);
    setReconnectNotice(reason);

    let remaining = 30;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setReconnectCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    }, 1000);

    networkTimerRef.current = setTimeout(() => {
      // 30 seconds expired without reconnection
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      networkTimerRef.current = undefined;
      isReconnectingRef.current = false;
      setIsReconnecting(false);

      if (!endedRef.current) {
        endedRef.current = true;
        ringtone.stop();
        endCall().finally(() => onClose('ended'));
      }
    }, 30_000);
  }, [joined, callConnected, endCall, onClose]);

  const handleNetworkRecovered = useCallback(() => {
    if (networkTimerRef.current) {
      clearTimeout(networkTimerRef.current);
      networkTimerRef.current = undefined;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = undefined;
    }

    if (isReconnectingRef.current) {
      isReconnectingRef.current = false;
      setIsReconnecting(false);
      setReconnectCountdown(30);
      setConnectionRestoredNotice(true);
      setTimeout(() => setConnectionRestoredNotice(false), 3000);

      // Re-verify and rejoin socket call room
      if (session?.callId) {
        joinCallRoom(session.callId);
      }
    }
  }, [session?.callId, joinCallRoom]);

  const freeMinuteActive = Boolean(
    isFreeMinuteApplied ?? (incoming?.isFreeMinuteApplied || outgoing?.isFreeMinuteApplied)
  );

  const isCoinLow = isAudience && coinsPerMinute > 0 && callConnected && !(freeMinuteActive && elapsed < 60) && (
    isLowBalance ||
    (currentUser?.diamonds != null && currentUser.diamonds < coinsPerMinute * 2)
  );

  const session = incoming
    ? { callId: incoming.callId, channel: incoming.channel, type: incoming.type, token: incoming.token }
    : outgoing
      ? { callId: outgoing.callId, channel: outgoing.channel, type: outgoing.type, token: outgoing.token }
      : undefined;
  callIdRef.current = session?.callId || '';

  const other = incoming?.initiator || outgoing?.callee;
  const isVideo = incoming?.type === 'video' || outgoing?.type === 'video';

  // Join per-call socket room
  useEffect(() => {
    if (!session?.callId) return;
    joinCallRoom(session.callId);
    return () => leaveCallRoom(session.callId);
  }, [session?.callId, joinCallRoom, leaveCallRoom]);

  // Fetch live roster
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
  }, [session?.callId, joined, currentUser?._id]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !session?.callId) return;

    const onCallRinging = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setIsTargetOnline(true);
    };

    const onCallCalling = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setIsTargetOnline(false);
      ringtone.stop();
    };

    const onMemberJoined = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      const myId = currentUser?._id || '';
      if (payload?.userId && payload.userId !== myId) {
        ringtone.stop();
        setRinging(false);
        setCallConnected(true);
        setAnswering(true);
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
      ringtone.stop();
      setRinging(false);
      setCallConnected(true);
      setAnswering(true);
      if (payload?.audienceDiamonds != null) {
        updateUser({ diamonds: payload.audienceDiamonds });
      }
      if (payload?.audienceCoins != null) {
        updateUser({ coins: payload.audienceCoins });
      }
      if (payload?.minutesBilled != null) {
        setMinutesBilled(payload.minutesBilled);
      }
      if (payload?.isLowBalance != null) {
        setIsLowBalance(Boolean(payload.isLowBalance));
      }
      if (payload?.minutesRemaining != null) {
        setMinutesRemaining(payload.minutesRemaining);
      }
    };

    const onCallEnded = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      ringtone.stop();
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

    socket.on('call:ringing', onCallRinging);
    socket.on('call:calling', onCallCalling);
    socket.on('call:member-joined', onMemberJoined);
    socket.on('call:member-left', onMemberLeft);
    socket.on('call:accept', onCallAccept);
    socket.on('call:end', onCallEnded);
    socket.on('call:message', onCallMessage);

    const onCoinsFinished = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      ringtone.stop();
      setCoinsFinished(true);
      if (!endedRef.current) {
        endedRef.current = true;
        endCall().catch(() => {});
      }
    };
    socket.on('call:coins-finished', onCoinsFinished);
    socket.on('call:diamonds-finished', onCoinsFinished);

    const onBalanceUpdate = (payload: any) => {
      if (payload?.diamonds != null || payload?.coins != null) {
        updateUser({
          ...(payload.diamonds != null && { diamonds: payload.diamonds }),
          ...(payload.coins != null && { coins: payload.coins }),
        });
      }
      if (payload?.minutesBilled != null) {
        setMinutesBilled(payload.minutesBilled);
      }
      if (payload?.isLowBalance != null) {
        setIsLowBalance(Boolean(payload.isLowBalance));
      }
      if (payload?.minutesRemaining != null) {
        setMinutesRemaining(payload.minutesRemaining);
      }
    };
    socket.on('balance:update', onBalanceUpdate);

    const onSocketDisconnect = (reason: string) => {
      if (reason !== 'io client disconnect') {
        handleNetworkLost('Server connection interrupted');
      }
    };
    const onSocketConnect = () => {
      handleNetworkRecovered();
    };

    socket.on('disconnect', onSocketDisconnect);
    socket.on('connect', onSocketConnect);

    return () => {
      socket.off('call:ringing', onCallRinging);
      socket.off('call:calling', onCallCalling);
      socket.off('call:member-joined', onMemberJoined);
      socket.off('call:member-left', onMemberLeft);
      socket.off('call:accept', onCallAccept);
      socket.off('call:end', onCallEnded);
      socket.off('call:message', onCallMessage);
      socket.off('call:coins-finished', onCoinsFinished);
      socket.off('call:diamonds-finished', onCoinsFinished);
      socket.off('balance:update', onBalanceUpdate);
      socket.off('disconnect', onSocketDisconnect);
      socket.off('connect', onSocketConnect);
    };
  }, [socket, session?.callId, chatOpen, currentUser?._id, endCall, onClose, updateUser, handleNetworkLost, handleNetworkRecovered]);

  // Window online/offline network detection
  useEffect(() => {
    const onOnline = () => {
      handleNetworkRecovered();
    };
    const onOffline = () => {
      handleNetworkLost('Internet connection lost');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleNetworkLost, handleNetworkRecovered]);

  // Agora RTC connection state monitor
  useEffect(() => {
    if (connectionState === 'RECONNECTING' || connectionState === 'DISCONNECTED') {
      if (joined || callConnected) {
        handleNetworkLost('Call connection interrupted');
      }
    } else if (connectionState === 'CONNECTED') {
      handleNetworkRecovered();
    }
  }, [connectionState, joined, callConnected, handleNetworkLost, handleNetworkRecovered]);

  // Monitor remote user presence in active connected 1:1 call
  useEffect(() => {
    if (callConnected && joined && !ringing && !incoming) {
      if (remoteUsers.length === 0) {
        handleNetworkLost('Other user is reconnecting…');
      } else {
        handleNetworkRecovered();
      }
    }
  }, [remoteUsers.length, callConnected, joined, ringing, incoming, handleNetworkLost, handleNetworkRecovered]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (networkTimerRef.current) clearTimeout(networkTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatOpen) {
      setUnreadChatCount(0);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // Join call when session is ready
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
        if (answering || accepted) {
          ringtone.stop();
          setRinging(false);
          setCallConnected(true);
        }
      })
      .catch(() => {
        if (answering || accepted) {
          ringtone.stop();
          setRinging(false);
          setCallConnected(true);
        }
      });
  }, [session?.callId, answering, outgoing, accepted]);

  // Re-attach local preview if camera toggled on
  useEffect(() => {
    if (joined && isVideo && cameraOn) {
      playLocalPreview();
    }
  }, [joined, isVideo, cameraOn, playLocalPreview]);

  // Callee accepted or remote track arrived
  useEffect(() => {
    if (accepted || remoteUsers.length > 0) {
      ringtone.stop();
      setRinging(false);
      setCallConnected(true);
      setAnswering(true);
    }
  }, [accepted, remoteUsers.length]);

  // Call duration timer
  useEffect(() => {
    if (!callConnected) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [callConnected]);

  // Billing heartbeat (priced calls)
  useEffect(() => {
    if (!callConnected || !isAudience || coinsPerMinute <= 0 || !session?.callId) return;

    billingIntervalRef.current = setInterval(() => {
      if (!session?.callId || endedRef.current) return;
      socket?.emit('call:billing-tick', { callId: session.callId }, (res: any) => {
        if (res?.result?.coinsFinished || res?.result?.diamondsFinished) {
          setCoinsFinished(true);
        }
        if (res?.result?.minutesBilled != null) {
          setMinutesBilled(res.result.minutesBilled);
        }
        if (res?.result?.audienceDiamonds != null) {
          updateUser({ diamonds: res.result.audienceDiamonds });
        }
        if (res?.result?.audienceCoins != null) {
          updateUser({ coins: res.result.audienceCoins });
        }
        if (res?.result?.isLowBalance != null) {
          setIsLowBalance(Boolean(res.result.isLowBalance));
        }
        if (res?.result?.minutesRemaining != null) {
          setMinutesRemaining(res.result.minutesRemaining);
        }
      });
    }, 60_000);

    return () => {
      if (billingIntervalRef.current) {
        clearInterval(billingIntervalRef.current);
        billingIntervalRef.current = null;
      }
    };
  }, [callConnected, isAudience, coinsPerMinute, session?.callId, socket, updateUser]);

  // Ringtone lifecycle
  useEffect(() => {
    if (incoming && ringing && !callConnected) {
      ringtone.start(true);
      const timeout = setTimeout(() => {
        if (!callConnected && !endedRef.current) {
          handleReject();
        }
      }, 45000);
      return () => {
        clearTimeout(timeout);
        ringtone.stop();
      };
    } else if (outgoing && ringing && !callConnected && isTargetOnline) {
      ringtone.start(false);
      const timeout = setTimeout(() => {
        if (!callConnected && !endedRef.current) {
          handleHangup();
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
  }, [incoming, outgoing, ringing, callConnected, isTargetOnline]);

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
    ringtone.stop();
    if (session) {
      await callApi.end(session.callId, 'ended').catch(() => {});
      if (isAudience && coinsPerMinute > 0) {
        callApi.finalize(session.callId).catch(() => {});
      }
    }
    await endCall();
    onClose('ended');
  }, [session?.callId, isAudience, coinsPerMinute, endCall, onClose]);

  const sendTextMessage = (textToSend: string) => {
    if (!textToSend.trim() || !session?.callId || !socket) return;

    const newMsg: CallChatMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      callId: session.callId,
      senderId: currentUser?._id || '',
      sender: {
        _id: currentUser?._id,
        nickname: currentUser?.nickname || 'Me',
        avatar: currentUser?.avatar,
      },
      text: textToSend.trim(),
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    socket.emit('call:message', {
      callId: session.callId,
      text: textToSend.trim(),
      sender: newMsg.sender,
    });
    setMessageText('');
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    sendTextMessage(messageText);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const gridClass =
    remoteUsers.length <= 1 ? 'grid-cols-1' :
    remoteUsers.length <= 4 ? 'grid-cols-2' :
    'grid-cols-3';

  const remoteNames = roster.filter((r) => r.remote).map((r) => r.nickname);
  const floatingMessages = chatMessages.slice(-3);

  // Soundwave animation bars for Voice/Audio calls
  const waveBars = [
    { height: [10, 32, 16, 44, 20], duration: 1.1 },
    { height: [18, 48, 24, 60, 18], duration: 0.9 },
    { height: [12, 36, 18, 52, 14], duration: 1.2 },
    { height: [22, 56, 28, 68, 24], duration: 0.8 },
    { height: [16, 42, 20, 54, 18], duration: 1.0 },
    { height: [20, 50, 26, 62, 22], duration: 0.85 },
    { height: [10, 28, 14, 38, 12], duration: 1.15 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#050508] text-white flex flex-col overflow-hidden select-none"
      role="dialog"
      aria-label={isVideo ? 'Video call' : 'Audio call'}
    >
      {/* 1. Underlying Video Canvas Area (Remote video stream attachment) */}
      <div id="call-video-area" className="absolute inset-0 bg-[#050508]" />

      {/* 2. Fullscreen Remote Video Grid (Video Call Mode) */}
      {joined && isVideo && remoteUsers.length > 0 && (
        <div className={`absolute inset-0 grid ${gridClass} gap-1 bg-black`}>
          {remoteUsers.map((uid, idx) => (
            <div
              key={String(uid)}
              className="relative w-full h-full bg-neutral-950 overflow-hidden flex items-center justify-center"
            >
              <div
                id={`remote-container-${uid}`}
                ref={(el) => {
                  if (el) {
                    playRemoteVideo(uid, el);
                  }
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Gradient vignette for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

              {/* Remote user nameplate badge */}
              <div className="absolute bottom-28 left-4 z-10 pointer-events-none">
                <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-xs font-black text-white/95 max-w-[150px] truncate tracking-wide">
                    {remoteNames[idx] || `Host ${uid}`}
                  </span>
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30">
                    LIVE
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Audio Call View / Connecting Screen (Creative Atmospheric Soundstage) */}
      {(!isVideo || ringing || !callConnected || (isVideo && callConnected && remoteUsers.length === 0)) && (
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0b0816] via-[#08070e] to-[#040406] flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
          {/* Ambient cosmic lighting orbs */}
          <div className="absolute top-1/4 -left-20 w-88 h-88 bg-purple-600/25 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/3 -right-20 w-88 h-88 bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

          {/* Top header details inside audio screen */}
          <div className="flex flex-col items-center text-center space-y-3.5 mt-8 sm:mt-12 z-10">
            {/* Call type badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] backdrop-blur-2xl border border-white/20 text-xs font-black tracking-wider uppercase text-white/90 shadow-xl"
            >
              {isVideo ? (
                <>
                  <Video className="w-4 h-4 text-pink-400" />
                  <span>1:1 Video Connection</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 text-purple-400" />
                  <span>1:1 Voice Call</span>
                </>
              )}
            </motion.div>

            {/* Caller Name */}
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              {other?.nickname || 'Partner'}
            </h2>

            {/* Connection / Status indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <span className={`w-2 h-2 rounded-full ${callConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-amber-400 animate-ping'}`} />
              <p className="text-xs sm:text-sm text-white/80 font-bold tracking-wide">
                {!callConnected
                  ? incoming
                    ? 'Incoming call...'
                    : isTargetOnline
                    ? 'Ringing...'
                    : 'Calling...'
                  : `In Call · ${fmt(elapsed)}`}
              </p>
            </div>

            {/* Pricing badge if call is paid */}
            {coinsPerMinute > 0 && (
              <div className="flex flex-col items-center gap-1.5">
                {freeMinuteActive && elapsed < 60 ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-400/50 rounded-full text-xs font-black text-emerald-300 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin" style={{ animationDuration: '4s' }} />
                    <span>1st Min FREE (1:1 VIP) · {60 - elapsed}s</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-cyan-500/15 border border-cyan-400/40 rounded-full text-xs font-black text-cyan-300 shadow-md"
                  >
                    <DiamondIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{coinsPerMinute.toLocaleString()} Diamonds / min</span>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Center Avatar Showcase with Pulsing Rings & Sound Waveform */}
          <div className="relative flex flex-col items-center justify-center my-auto z-10">
            {/* Animated sonar rings for ringing/calling state */}
            {ringing && !callConnected && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.45, 1.95], opacity: [0.7, 0.25, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-purple-400/50 pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.35, 1.7], opacity: [0.8, 0.35, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
                  className="absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-pink-400/50 pointer-events-none"
                />
              </>
            )}

            {/* Main Avatar Container with Holographic Gradient Border */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative p-1.5 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 shadow-[0_0_60px_rgba(168,85,247,0.5)] ring-4 ring-black/40"
            >
              <div className="p-1 rounded-full bg-black/60 backdrop-blur-xl">
                <Avatar
                  src={other?.avatar}
                  nickname={other?.nickname || '?'}
                  size="xl"
                  className="w-32 h-32 sm:w-40 sm:h-40 text-4xl font-black shadow-inner"
                />
              </div>
            </motion.div>

            {/* Live Audio Equalizer Waveform Bars & Speaker Mode Toggle (Active when call is connected) */}
            {callConnected && !isVideo && (
              <motion.button
                type="button"
                onClick={toggleSpeaker}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2.5 mt-8 px-5 py-2.5 rounded-2xl backdrop-blur-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.4)] cursor-pointer transition-all ${
                  speakerOn
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 ring-2 ring-emerald-500/30'
                    : 'bg-white/[0.06] border-white/15 text-white/80'
                }`}
                title="Tap to toggle Loudspeaker / Earpiece mode"
              >
                {speakerOn ? (
                  <SpeakerIcon className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                ) : (
                  <SpeakerSlashIcon className="w-4 h-4 text-white/50 shrink-0" />
                )}
                <div className="flex items-center gap-1.5 h-8">
                  {waveBars.map((bar, i) => (
                    <motion.span
                      key={i}
                      animate={{ height: speakerOn ? bar.height : Math.max(5, Math.round(bar.height * 0.5)) }}
                      transition={{
                        duration: bar.duration,
                        repeat: Infinity,
                        repeatType: 'reverse',
                        ease: 'easeInOut',
                      }}
                      className={`w-1.5 rounded-full ${
                        speakerOn
                          ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300'
                          : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex flex-col text-left ml-1.5">
                  <span className="text-[11px] font-black tracking-wider uppercase leading-tight">
                    {speakerOn ? 'LOUDSPEAKER ON' : 'EARPIECE MODE'}
                  </span>
                  <span className="text-[9px] text-white/50 font-medium">Tap to toggle</span>
                </div>
              </motion.button>
            )}
          </div>

          {/* Privacy footer guarantee */}
          <div className="z-10 flex items-center gap-1.5 text-[11px] text-white/50 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End Encrypted Voice Connection</span>
          </div>

          {/* Spacer */}
          <div className="h-24" />
        </div>
      )}

      {/* 4. Draggable Local Video Preview (PiP for Video Calls) */}
      <AnimatePresence>
        {joined && isVideo && (
          <motion.div
            drag
            dragMomentum={false}
            dragConstraints={{ left: -320, right: 0, top: 0, bottom: 480 }}
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute top-16 right-4 z-30 w-32 sm:w-36 h-48 sm:h-52 rounded-3xl overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.8)] bg-neutral-950 border-2 border-white/20 backdrop-blur-md cursor-grab active:cursor-grabbing group"
          >
            {cameraOn ? (
              <div
                id="call-local-video-container"
                className="w-full h-full relative object-cover"
                style={{ filter: activeFilter.css }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-white/60 space-y-2 p-2 text-center">
                <VideoOff className="w-7 h-7 text-white/40" />
                <span className="text-[10px] font-bold">Camera Off</span>
              </div>
            )}

            {/* PiP Header Tags, Mirror toggle & Flip camera shortcut */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-auto">
              <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-black text-white/90 border border-white/10">
                You {activeFilter.id !== 'natural' && `· ${activeFilter.label}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMirror();
                  }}
                  className={`p-1.5 rounded-full backdrop-blur-md border shadow active:scale-95 transition-all ${
                    mirrorOn
                      ? 'bg-purple-600/80 text-white border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                      : 'bg-black/70 text-white/70 border-white/10'
                  }`}
                  title={mirrorOn ? 'Mirroring: ON (tap to turn off)' : 'Mirroring: OFF (tap to turn on)'}
                >
                  <MirrorIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    switchCamera();
                  }}
                  className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white/90 hover:text-white border border-white/10 shadow active:scale-95 transition-all"
                  title={`Flip Camera (${facingMode === 'user' ? 'Front -> Back' : 'Back -> Front'})`}
                >
                  <CameraRotate className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Floating Top Bar HUD (Status, Timer, Billing, Participants) */}
      {joined && (
        <header className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
          {/* Left: Call Timer Capsule & HD Badge */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/15 shadow-[0_4px_25px_rgba(0,0,0,0.6)]">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isReconnecting
                  ? 'bg-amber-400 animate-ping'
                  : callConnected
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400 animate-pulse'
              }`} />
              <span className="text-xs font-black text-white tracking-widest font-mono">
                {isReconnecting
                  ? `RECONNECTING (${reconnectCountdown}s)`
                  : callConnected
                    ? fmt(elapsed)
                    : incoming
                      ? 'INCOMING'
                      : isTargetOnline
                        ? 'RINGING'
                        : 'CALLING'}
              </span>
            </div>

            {/* HD Quality indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-[11px] font-bold text-white/80">
              <WifiIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>HD</span>
            </div>
          </div>

          {/* Right: Coins Billing & Roster */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {coinsPerMinute > 0 && (
              freeMinuteActive && elapsed < 60 ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600/30 to-teal-600/30 backdrop-blur-2xl border border-emerald-400/60 text-xs font-black text-emerald-300 shadow-lg animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="tabular-nums font-mono">1st Min FREE ({60 - elapsed}s)</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/25 backdrop-blur-2xl border border-cyan-400/50 text-xs font-black text-cyan-300 shadow-lg"
                >
                  <DiamondIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="tabular-nums font-mono">{isAudience ? '-' : '+'}{coinsPerMinute.toLocaleString()}/min</span>
                </motion.div>
              )
            )}

            {roster.length > 2 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 text-xs text-white/80 font-bold">
                <Users className="w-3.5 h-3.5" />
                <span>{roster.length}</span>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Low Diamonds Warning Banner */}
      <AnimatePresence>
        {joined && callConnected && isAudience && coinsPerMinute > 0 && isCoinLow && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 inset-x-4 z-40 mx-auto max-w-sm pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-cyan-500/95 text-slate-950 backdrop-blur-xl border border-cyan-300 shadow-[0_8px_30px_rgba(6,182,212,0.5)] animate-pulse">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl shrink-0">💎</span>
                <div className="text-left leading-tight min-w-0">
                  <p className="text-xs font-black tracking-tight">Low Diamonds Warning!</p>
                  <p className="text-[11px] font-bold text-slate-900 truncate">
                    {currentUser?.diamonds != null && currentUser.diamonds < coinsPerMinute
                      ? 'Last prepaid minute running!'
                      : `~${Math.floor((currentUser?.diamonds || 0) / coinsPerMinute)} min left`} ({currentUser?.diamonds ?? 0} diamonds remaining)
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open('/store', '_blank')}
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-black text-cyan-400 text-xs font-black shadow-md active:scale-95 transition-all"
              >
                Recharge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Floating Heads-Up Live Messages Toast (When chat drawer is closed) */}
      {joined && !chatOpen && floatingMessages.length > 0 && (
        <div className="absolute bottom-28 left-4 z-20 max-w-[280px] sm:max-w-xs space-y-2 pointer-events-none">
          {floatingMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-black/75 backdrop-blur-2xl rounded-2xl px-3.5 py-2 border border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.6)] text-xs flex items-start gap-2.5"
            >
              <Avatar
                src={msg.sender.avatar}
                nickname={msg.sender.nickname}
                size="xs"
                className="shrink-0 mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="font-black text-[10px] text-pink-400 truncate">
                  {msg.sender._id === currentUser?._id ? 'You' : msg.sender.nickname}
                </p>
                <p className="text-white font-medium text-xs break-words leading-relaxed">{msg.text}</p>
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
            className="absolute bottom-28 inset-x-4 sm:max-w-md sm:mx-auto z-40 bg-neutral-950/90 backdrop-blur-3xl rounded-3xl p-4 border border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-black text-white tracking-wide">Beauty Camera Filters</h4>
              </div>
              <button
                onClick={() => setFilterPickerOpen(false)}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-[0_0_18px_rgba(236,72,153,0.6)] scale-105'
                        : 'bg-white/[0.05] text-white/70 border-white/10 hover:bg-white/[0.1]'
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

      {/* 8. In-Call Text Chat Drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 top-1/3 sm:top-1/4 sm:max-w-md sm:left-auto sm:right-6 z-40 bg-neutral-950/95 backdrop-blur-3xl rounded-t-3xl sm:rounded-3xl flex flex-col border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <ChatIcon className="w-4 h-4 text-purple-400" />
                <h3 className="font-black text-sm text-white">Live Call Chat</h3>
                <span className="text-xs text-white/50 font-bold">({chatMessages.length})</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick chat preset chips */}
            <div className="flex gap-2 px-4 py-2 border-b border-white/5 overflow-x-auto no-scrollbar bg-black/30">
              {QUICK_CHAT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => sendTextMessage(preset)}
                  className="shrink-0 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-white/80 active:scale-95 transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 text-xs text-center space-y-2 py-8">
                  <SmileyIcon className="w-8 h-8 text-purple-400/40" />
                  <p className="font-bold">No messages yet.</p>
                  <p className="text-[11px] text-white/30">Send a friendly greeting or tap a quick phrase above</p>
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
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none'
                            : 'bg-neutral-800/90 text-white border border-white/10 rounded-bl-none'
                        }`}
                      >
                        {!isMe && (
                          <p className="text-[10px] font-black text-pink-400 mb-0.5">
                            {msg.sender.nickname}
                          </p>
                        )}
                        <p className="break-words leading-relaxed font-medium">{msg.text}</p>
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
                className="flex-1 bg-neutral-800/90 border border-white/15 rounded-full px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                  messageText.trim()
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:scale-105 active:scale-95'
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

      {/* 9.5. 30-Second Network Reconnecting Banner / Overlay */}
      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-16 sm:top-20 inset-x-4 z-40 flex justify-center pointer-events-none"
          >
            <div className="pointer-events-auto flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-amber-950/90 backdrop-blur-2xl border-2 border-amber-400/60 shadow-[0_12px_45px_rgba(245,158,11,0.5)] text-white max-w-md w-full">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/40 shrink-0">
                <WifiSlashIcon className="w-5 h-5 text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300 tracking-wider uppercase">
                    Reconnecting…
                  </span>
                  <span className="text-xs font-mono font-black text-amber-200 bg-amber-500/30 px-2.5 py-0.5 rounded-full border border-amber-400/50 tabular-nums">
                    {reconnectCountdown}s
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/90 truncate mt-0.5 font-medium">
                  {reconnectNotice || 'Internet connection lost. Trying to reconnect...'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {connectionRestoredNotice && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 sm:top-20 inset-x-4 z-40 flex justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-950/90 backdrop-blur-2xl border border-emerald-400/60 shadow-[0_8px_30px_rgba(16,185,129,0.4)] text-emerald-300 text-xs font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Connection restored!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10. Error notice bar */}
      {error && !isReconnecting && (
        <div className="absolute bottom-24 inset-x-0 z-30 flex justify-center px-6 pointer-events-none">
          <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-500/40 rounded-full px-4 py-2 backdrop-blur-xl shadow-lg">
            {error}
          </div>
        </div>
      )}

      {/* 11. Luxury Responsive Floating Bottom Control Dock */}
      <footer className="absolute bottom-6 sm:bottom-8 inset-x-0 z-30 flex items-center justify-center px-4 pointer-events-none">
        {incoming && ringing && !answering ? (
          /* Incoming Call Action Controls (Decline & Accept) */
          <div className="pointer-events-auto flex items-center justify-around w-full max-w-sm px-6 py-4 rounded-3xl bg-black/60 backdrop-blur-2xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.8)]">
            {/* Decline Action */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleReject}
                aria-label="Decline call"
                className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-700 shadow-[0_0_30px_rgba(244,63,94,0.5)] border border-rose-400/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs font-black text-rose-400 tracking-wide">Decline</span>
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
              <span className="text-xs font-black text-emerald-400 tracking-wide">Accept</span>
            </div>
          </div>
        ) : (
          /* Active / Connected Call Control Dock */
          <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 px-4 sm:px-5 py-3 rounded-full bg-neutral-950/75 backdrop-blur-3xl border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.85)]">
            {/* NEXT Match button (Random Match Mode) */}
            {joined && onNext && (
              <button
                onClick={onNext}
                aria-label="Next match"
                className="h-11 sm:h-12 px-3.5 rounded-full flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all"
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
                      ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.6)]'
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

                {/* 2. Flip Camera (Direct Front <-> Back) */}
                {isVideo && (
                  <button
                    onClick={switchCamera}
                    aria-label={`Switch camera to ${facingMode === 'user' ? 'rear' : 'front'}`}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white/10 text-white/90 border border-white/10 hover:bg-white/20 active:scale-95 transition-all"
                    title={`Flip Camera (${facingMode === 'user' ? 'Front -> Back' : 'Back -> Front'})`}
                  >
                    <CameraRotate className="w-5 h-5" />
                  </button>
                )}

                {/* 2.5. Mirror Mode Toggle */}
                {isVideo && (
                  <button
                    onClick={toggleMirror}
                    aria-label={mirrorOn ? 'Disable mirror mode' : 'Enable mirror mode'}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                      mirrorOn
                        ? 'bg-purple-600/25 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                        : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
                    }`}
                    title={mirrorOn ? 'Mirroring: ON (natural movement)' : 'Mirroring: OFF'}
                  >
                    <MirrorIcon className="w-5 h-5" />
                  </button>
                )}

                {/* 3. Beauty Filter (Video Calls) */}
                {isVideo && (
                  <button
                    onClick={() => {
                      setFilterPickerOpen(!filterPickerOpen);
                      setChatOpen(false);
                    }}
                    aria-label="Beauty filter"
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                      filterPickerOpen || activeFilter.id !== 'natural'
                        ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_18px_rgba(236,72,153,0.7)]'
                        : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                    }`}
                    title="Beauty filters"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                )}

                {/* 4. Camera Toggle (Video Calls) */}
                {isVideo && (
                  <button
                    onClick={toggleCamera}
                    aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                      cameraOn
                        ? 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                        : 'bg-rose-500/25 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
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
                      : 'bg-rose-500/25 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  }`}
                  title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* 6. Loudspeaker Toggle */}
                <button
                  onClick={toggleSpeaker}
                  aria-label={speakerOn ? 'Turn loudspeaker off' : 'Turn loudspeaker on'}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all border ${
                    speakerOn
                      ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      : 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20'
                  }`}
                  title={speakerOn ? 'Loudspeaker: ON' : 'Loudspeaker: OFF (Earpiece mode)'}
                >
                  {speakerOn ? <SpeakerIcon className="w-5 h-5" /> : <SpeakerSlashIcon className="w-5 h-5" />}
                </button>
              </>
            )}

            {/* 6. End Call Button */}
            <button
              onClick={handleHangup}
              aria-label="End call"
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 shadow-[0_0_24px_rgba(225,29,72,0.7)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
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
