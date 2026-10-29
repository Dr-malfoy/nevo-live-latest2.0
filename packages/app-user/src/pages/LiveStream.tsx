import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { streamsApi, giftsApi } from '../api';
import { gamesApi } from '../api/economy.api';
import { transferApi } from '../api/transfer.api';
import { useSocketStore, useAuthStore, useUIStore, useLivePlayerStore } from '../stores';
import { motion, AnimatePresence } from 'framer-motion';
import { GiftPanel } from '../components/stream';
import { Modal } from '../components/ui';
import { ReportModal } from '../components/report/ReportModal';
import { LiveRoom, UserProfileModal, StreamEndedRecap } from '../components/live';
import type { RoomMessage, RoomNotification, TopGifterItem, LiveSpeakerItem, MicRequester } from '../components/live';
import { useFloatingGifts, FloatingGifts } from '../components/party/FloatingGifts';
import { useAgora } from '../hooks/useAgora';
import { useFollow } from '../hooks/useFollow';
import { useVideoFilters } from '../hooks/useVideoFilters';
import { registerLiveSession, endLiveSession } from '../services/liveSession';
import { getMediaUrl } from '../lib/media';
import type { LiveStream, Gift as GiftType } from '../types';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || 'b0b508017ff54158a6e30f30c7cbea98';
const NETWORK_GRACE_MS = 30_000; // 30s grace window before auto-ending on network loss
const HEARTBEAT_INTERVAL_MS = 15_000;

export interface LiveStreamPageProps {
  streamIdProp?: string;
  isMinimized?: boolean;
  onMaximize?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
}

export const LiveStreamPage = ({
  streamIdProp,
  isMinimized: isMinimizedProp,
  onMaximize: onMaximizeProp,
  onMinimize: onMinimizeProp,
  onClose: onCloseProp,
}: LiveStreamPageProps = {}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = streamIdProp || paramId;
  const navigate = useNavigate();
  const { isMinimized: storeMinimized, setMinimized, closeStream } = useLivePlayerStore();
  const isMinimized = isMinimizedProp ?? storeMinimized;
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const { socket, joinRoom, leaveRoom } = useSocketStore();
  const { showToast } = useUIStore();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [token, setToken] = useState('');
  const [channel, setChannel] = useState('');
  const [agoraUid, setAgoraUid] = useState<number | undefined>(undefined);
  const [showGift, setShowGift] = useState(false);
  const [chatMessages, setChatMessages] = useState<RoomMessage[]>([]);
  const [joining, setJoining] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [serverIsHost, setServerIsHost] = useState(false);
  const [notifications, setNotifications] = useState<RoomNotification[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [giftBurst, setGiftBurst] = useState<{ id: string; gift: GiftType; count: number; nickname: string } | null>(null);
  const [topGifters, setTopGifters] = useState<TopGifterItem[]>([]);
  const [speakers, setSpeakers] = useState<LiveSpeakerItem[]>([]);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [micRequestPending, setMicRequestPending] = useState(false);
  const [pendingMicRequester, setPendingMicRequester] = useState<MicRequester | null>(null);
  const [customGiftReceiverId, setCustomGiftReceiverId] = useState<string | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [pkBattle, setPkBattle] = useState<any>(null);
  const [pendingPkInvite, setPendingPkInvite] = useState<any>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [streamEndedRecap, setStreamEndedRecap] = useState<{
    duration: string;
    viewers: number;
    likes: number;
    hostName: string;
    hostAvatar?: string;
    image?: string;
    isHost: boolean;
  } | null>(null);
  const totalViewersRef = useRef(1);
  const peakViewersRef = useRef(1);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(30);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>();
  const burstTimer = useRef<ReturnType<typeof setTimeout>>();
  const { items: floatingGiftItems, triggerGifts } = useFloatingGifts();
  const sendingGiftRef = useRef(false);
  const isHostRef = useRef(false);
  const endedRef = useRef(false);
  const tokenRef = useRef('');
  const hasLikedRef = useRef(false);
  // Set when the user navigates to a profile (host card / viewer) — the unmount
  // cleanup must still tear down the session, but must NOT navigate again (that
  // would override the profile route the user just opened).
  const navigatingAwayRef = useRef(false);

  const {
    joined,
    cameraOn,
    micOn,
    error,
    joinChannel,
    playLocalVideo,
    refreshVideoTracks,
    toggleCamera,
    toggleMic,
    switchCamera,
    leaveChannel,
    getLocalStream,
    applyBeautyOptions,
  } = useAgora();

  const micOnRef = useRef(micOn);
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  // Null-safe: hostId can be null (orphaned user ref), a string, or a populated object.
  // Prefer the server-reported isHost (from joinStream); fall back to client-side derivation.
  const isHost = serverIsHost || !!(stream && user && stream.hostId && typeof stream.hostId === 'object' && stream.hostId._id === user._id);
  isHostRef.current = isHost;

  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const networkTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  const formatRecapDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `0:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Start/stop elapsed timer when joining/leaving
  useEffect(() => {
    if (joined) {
      elapsedRef.current = 0;
      setElapsed(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [joined]);

  // ── CENTRALIZED CLEANUP ────────────────────────────────────────────
  // Every exit path (End, Back, unmount, network timeout) funnels through
  // endLiveSession(), which is idempotent. We register the session context
  // once the stream + host role are known.
  const fireEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    endLiveSession();
  }, []);

  useEffect(() => {
    if (!id) return;
    // (Re)register whenever the identity of the session is settled
    registerLiveSession({
      streamId: id,
      isHost: isHostRef.current,
      leaveChannel,
      socket,
      navigate: () => {
        // Navigating to a profile already happened — don't override it.
        if (navigatingAwayRef.current) return;
        // If stream ended and recap is displayed, keep user on recap until they tap "Go Back Home"
        if (endedRef.current) return;
        if (isHostRef.current) navigate('/streamer-center', { replace: true });
        else navigate(-1);
      },
    });
  }, [id, isHost, socket, leaveChannel, navigate]);

  // Host heartbeat — keeps the session fresh server-side while live
  useEffect(() => {
    if (!joined || !isHost || !id) return;
    heartbeatRef.current = setInterval(() => {
      streamsApi.heartbeat(id).catch(() => {
        // Heartbeat failure is non-fatal — the next tick will retry
      });
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [joined, isHost, id]);

  // Live Activity & Task Progress Tracking (watches live / streams live)
  useEffect(() => {
    if (!joined || !id) return;
    // Track every 30 seconds (0.5 minute increment or 1 minute every 60s)
    const metricName = isHost ? 'live_stream_minutes' : 'live_watch_minutes';
    const interval = setInterval(() => {
      gamesApi.recordProgress(metricName, 1).catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, [joined, isHost, id]);

  // Network grace: 30s grace with reconnect countdown before auto-ending
  const handleNetworkLost = useCallback(() => {
    if (networkTimerRef.current) return;

    setIsReconnecting(true);
    setReconnectCountdown(30);

    let remaining = 30;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setReconnectCountdown(Math.max(0, remaining));
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      }
    }, 1000);

    networkTimerRef.current = setTimeout(() => {
      setIsReconnecting(false);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      showToast('Connection lost — ending live session', 'error');
      fireEnd();
    }, NETWORK_GRACE_MS);
  }, [fireEnd, showToast]);

  const handleNetworkRecover = useCallback(() => {
    if (networkTimerRef.current) {
      clearTimeout(networkTimerRef.current);
      networkTimerRef.current = undefined;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = undefined;
    }
    setIsReconnecting(false);
    showToast('Connection restored!', 'success');

    // Re-verify socket and channel health
    if (socket && id) {
      socket.emit('stream:join', { streamId: id });
    }
  }, [socket, id, showToast]);

  // Window offline/online event detection
  useEffect(() => {
    if (!joined) return;

    const onOffline = () => {
      handleNetworkLost();
    };

    const onOnline = () => {
      handleNetworkRecover();
    };

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [joined, handleNetworkLost, handleNetworkRecover]);

  // Load stream first, then join Agora — ordering ensures isHost is correct before the join effect fires
  useEffect(() => {
    if (!id) return;

    streamsApi.getStream(id).then(({ data }) => {
      if (data.success && data.data) {
        setStream(data.data);
        if (typeof data.data.viewerCount === 'number') {
          peakViewersRef.current = Math.max(peakViewersRef.current, data.data.viewerCount);
          totalViewersRef.current = Math.max(totalViewersRef.current, data.data.viewerCount);
        }
        // Now that we know the stream (and thus isHost), fetch the token
        return streamsApi.joinStream(id);
      }
    }).then(({ data }: any) => {
      if (data?.success && data?.data) {
        setToken(data.data.token);
        tokenRef.current = data.data.token;
        setChannel(data.data.channel);
        setServerIsHost(!!data.data.isHost);
        if (typeof data.data.uid === 'number') setAgoraUid(data.data.uid);
        if (typeof data.data.viewerCount === 'number') {
          peakViewersRef.current = Math.max(peakViewersRef.current, data.data.viewerCount);
          totalViewersRef.current = Math.max(totalViewersRef.current, data.data.viewerCount);
          setStream((prev) => (prev ? { ...prev, viewerCount: data.data.viewerCount } : prev));
        }
      }
    }).catch((err) => {
      console.error('Failed to load stream:', err);
      showToast(err.response?.data?.error || 'Failed to load stream', 'error');
    });

    return () => {
      // Unmount → centralized cleanup (Back button / navigation / screen disposal).
      // Only fire if a session actually started (token received) — this avoids
      // StrictMode's dev double-mount cancelling the join before it begins.
      if (tokenRef.current) fireEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Join Agora channel once we have token
  useEffect(() => {
    if (!token || !channel || joining) return;
    setJoining(true);
    joinChannel({
      appId: AGORA_APP_ID,
      channel,
      token,
      uid: agoraUid,
      role: isHost ? 'host' : 'audience',
      videoEnabled: stream?.type !== 'voice',
      onNetworkLost: handleNetworkLost,
      onNetworkRecover: handleNetworkRecover,
      socket,
      streamId: id,
    }).catch((err) => {
      console.warn('[LiveStream] Agora join error (running in fallback mode):', err?.message || err);
      if (err?.message?.includes('permission')) {
        showToast('Camera or microphone permission denied', 'error');
      }
    }).finally(() => setJoining(false));
  }, [token, channel, isHost, stream?.type, agoraUid, socket, id]);

  // Play local video once joined as host (video rooms only)
  useEffect(() => {
    if (joined && isHost && stream?.type !== 'voice') {
      // Small delay ensures the DOM container is ready
      const t = setTimeout(() => playLocalVideo('agora-video-area'), 200);
      return () => clearTimeout(t);
    }
  }, [joined, isHost, stream?.type]);

  // When window is minimized or maximized, refresh video tracks so playback never drops
  useEffect(() => {
    if (joined) {
      const t1 = setTimeout(() => refreshVideoTracks('agora-video-area'), 50);
      const t2 = setTimeout(() => refreshVideoTracks('agora-video-area'), 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [joined, isMinimized, refreshVideoTracks]);

  // Socket setup
  useEffect(() => {
    if (!socket || !id) return;
    joinRoom(`stream:${id}`, { streamId: id });

    const onChat = (msg: any) => {
      // Self messages are already appended optimistically — skip the socket echo
      if (userRef.current && msg?.userId === userRef.current._id) return;
      // Sanitize at the boundary so a malformed payload can never crash render
      setChatMessages((prev) => [
        ...prev,
        {
          userId: msg?.userId ?? '',
          nickname: msg?.nickname || 'Guest',
          avatar: msg?.avatar || '',
          level: msg?.level || 1,
          wealthLevel: msg?.wealthLevel || msg?.level || 1,
          liveLevel: msg?.liveLevel || msg?.level || 1,
          message: String(msg?.message ?? '').slice(0, 500),
        },
      ]);
    };
    const onGift = (msg: any) => {
      const isSelf = Boolean(userRef.current && msg?.userId === userRef.current._id);
      const giftCount = msg?.count || 1;
      const giftObj = msg?.gift;
      const entry: RoomMessage = {
        ...msg,
        isGift: true,
        nickname: msg?.nickname || (isSelf ? (userRef.current?.nickname || 'You') : 'Guest'),
        level: msg?.level || 1,
        wealthLevel: msg?.wealthLevel || msg?.level || 1,
        liveLevel: msg?.liveLevel || msg?.level || 1,
        message: `Sent ${giftCount > 1 ? `${giftCount}x ` : ''}${giftObj?.name || 'a gift'}!`,
      };
      // Append to chat if not self (self added optimistically)
      if (!isSelf) {
        setChatMessages((prev) => [...prev, entry]);
      }
      // Trigger the pop-up animation and floating gifts for everyone
      if (giftObj) {
        if (!isSelf) {
          setGiftBurst({
            id: `${Date.now()}-${Math.random()}`,
            gift: giftObj,
            count: giftCount,
            nickname: msg.nickname || 'Someone',
          });
          if (burstTimer.current) clearTimeout(burstTimer.current);
          burstTimer.current = setTimeout(() => setGiftBurst(null), 5000);

          triggerGifts(giftObj.icon || giftObj.animation || '🎁', giftObj.name || 'Gift', Math.min(giftCount, 6));
        }
      }

      // Show top gift notification banner card for EVERYONE in the live room (auto-dismiss 5s)
      const senderName = isSelf ? 'You' : (msg?.nickname || 'Someone');
      const isRecipient = Boolean(
        userRef.current && (
          (msg?.receiverId && userRef.current._id === msg.receiverId) ||
          (!msg?.receiverId && isHostRef.current)
        )
      );

      const notifText = isSelf
        ? `You sent ${giftCount > 1 ? `${giftCount}x ` : ''}${giftObj?.name || 'a gift'}!`
        : isRecipient
          ? `${senderName} sent you ${giftCount > 1 ? `${giftCount}x ` : ''}${giftObj?.name || 'a gift'}!`
          : `${senderName} sent ${giftCount > 1 ? `${giftCount}x ` : ''}${giftObj?.name || 'a gift'}!`;

      const notifId = `${Date.now()}-${Math.random()}`;
      setNotifications((prev) => [
        ...prev.slice(-4),
        {
          id: notifId,
          kind: 'gift',
          text: notifText,
          avatar: msg?.avatar,
        },
      ]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 5000);
    };
    const onEnded = () => {
      endedRef.current = true;
      try {
        if (timerRef.current) clearInterval(timerRef.current);
        leaveChannel();
      } catch {}

      // If user is currently in minimized window (or browsing other pages):
      // Immediately close and remove the floating mini player without taking over the screen!
      const currentPath = window.location.pathname;
      const isViewingFullScreen = currentPath.startsWith('/live/') || currentPath.startsWith('/stream/');

      if (isMinimized || !isViewingFullScreen) {
        closeStream();
        onCloseProp?.();
        showToast('Live stream has ended', 'info');
        return;
      }

      setMinimized(false);

      const titlePicture = stream?.cover || stream?.thumbnail || (stream as any)?.coverImage;
      const profilePicture = host?.avatar || user?.avatar;
      const resolvedImage = titlePicture ? getMediaUrl(titlePicture) : (profilePicture ? getMediaUrl(profilePicture) : undefined);

      const recap = {
        duration: formatRecapDuration(elapsedRef.current),
        viewers: Math.max(totalViewersRef.current, peakViewersRef.current, stream?.viewerCount || 0, 1),
        likes: likeCount,
        hostName: host?.nickname || 'Streamer',
        hostAvatar: resolvedImage,
        image: resolvedImage,
        isHost: false,
      };

      setStreamEndedRecap(recap);
    };
    const onLike = (data?: any) => {
      // 1 user gives love repeatedly -> counted only 1 time per user
      if (typeof data?.totalLikes === 'number') {
        setLikeCount(data.totalLikes);
      } else if (data?.isCounted !== false) {
        setLikeCount((c) => c + 1);
      }

      // Only show top popup notification on the first counted like
      if (data?.isCounted !== false) {
        const currentUser = userRef.current;
        const isSelf = Boolean(
          currentUser && (
            (data?.userId && (currentUser._id === data.userId || (currentUser as any).id === data.userId)) ||
            (data?.nickname && currentUser.nickname === data.nickname)
          )
        );

        const senderName = isSelf ? 'You' : (data?.nickname || 'Someone');
        const avatar = data?.avatar || (isSelf ? currentUser?.avatar : undefined);

        const notifId = `like-${Date.now()}-${Math.random()}`;
        setNotifications((prev) => [
          ...prev.slice(-3),
          {
            id: notifId,
            kind: 'like',
            text: `${senderName} sent love ❤️`,
            avatar,
            durationMs: 3500,
          },
        ]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 3500);
      }
    };

    const onLikeCount = (data?: any) => {
      if (typeof data?.count === 'number') {
        setLikeCount(data.count);
      }
    };
    const onGiftNotif = (notif: any) => {
      // In-room toast when direct personal notification arrives
      if (notif?.type === 'gift') {
        const msg = notif.message || 'You received a gift!';
        setNotifications((prev) => {
          // Avoid duplicate banner if onGift already displayed it
          const exists = prev.some((p) => p.text.includes(msg) || msg.includes(p.text));
          if (exists) return prev;
          const notifId = `${Date.now()}-${Math.random()}`;
          setTimeout(() => {
            setNotifications((curr) => curr.filter((n) => n.id !== notifId));
          }, 5000);
          return [
            ...prev.slice(-4),
            { id: notifId, kind: 'gift', text: msg, avatar: notif.data?.senderAvatar },
          ];
        });
      }
    };

    const onViewerJoined = (msg: any) => {
      totalViewersRef.current += 1;
      if (msg?.nickname) {
        setChatMessages((prev) => [
          ...prev,
          {
            userId: msg.userId || '',
            nickname: msg.nickname,
            avatar: msg.avatar || '',
            level: msg.level || 1,
            wealthLevel: msg.wealthLevel || msg.level || 1,
            liveLevel: msg.liveLevel || msg.level || 1,
            message: '',
            kind: 'join',
          } as RoomMessage,
        ]);
      }
      if (typeof msg?.viewerCount === 'number') {
        peakViewersRef.current = Math.max(peakViewersRef.current, msg.viewerCount);
        setStream((prev) => (prev ? { ...prev, viewerCount: Math.max(0, msg.viewerCount) } : prev));
      } else {
        const nextCount = (stream?.viewerCount || 0) + 1;
        peakViewersRef.current = Math.max(peakViewersRef.current, nextCount);
        setStream((prev) => (prev ? { ...prev, viewerCount: nextCount } : prev));
      }
    };
    const onViewerLeft = (msg: any) => {
      if (typeof msg?.viewerCount === 'number') {
        setStream((prev) => (prev ? { ...prev, viewerCount: Math.max(0, msg.viewerCount) } : prev));
      } else {
        setStream((prev) => (prev ? { ...prev, viewerCount: Math.max(0, (prev.viewerCount || 0) - 1) } : prev));
      }
    };
    const onViewerCount = (msg: any) => {
      if (typeof msg?.count === 'number') {
        peakViewersRef.current = Math.max(peakViewersRef.current, msg.count);
        totalViewersRef.current = Math.max(totalViewersRef.current, msg.count);
        setStream((prev) => (prev ? { ...prev, viewerCount: Math.max(0, msg.count) } : prev));
      }
    };

    const onTopGifters = (data: any) => {
      if (data?.topGifters) {
        setTopGifters(data.topGifters);
      }
    };
    const onSpeakersUpdate = (data: any) => {
      if (data?.speakers) {
        setSpeakers(data.speakers);
        const myId = userRef.current?._id;
        const meAsSpeaker = data.speakers.find((s: any) => s.userId === myId);
        if (meAsSpeaker) {
          setIsSpeaker(true);
          setMicRequestPending(false);
          // If approved as speaker and mic is not unmuted yet, turn it on
          if (!micOnRef.current && !isHostRef.current) {
            toggleMic(true).catch(() => {});
          }
        } else if (!isHostRef.current) {
          setIsSpeaker(false);
        }
      }
    };
    const onMicRequested = (data: any) => {
      if (isHostRef.current && data?.requester) {
        setPendingMicRequester(data.requester);
      }
    };
    const onMicResponse = (data: any) => {
      // If scoped to a specific user, ensure it is meant for this user
      if (data?.requesterUserId && userRef.current && data.requesterUserId !== userRef.current._id) {
        return;
      }
      setMicRequestPending(false);
      if (data?.approved) {
        setIsSpeaker(true);
        showToast(data.message || 'The host accepted your speak request!', 'success');
        toggleMic(true).catch((err) => {
          console.warn('[LiveStream] toggleMic error on accept:', err);
        });
      } else {
        setIsSpeaker(false);
        showToast(data.message || 'The host declined your speak request.', 'info');
      }
    };
    const onMicKicked = (data: any) => {
      setIsSpeaker(false);
      toggleMic(false).catch(() => {});
      showToast(data.message || 'You left the microphone.', 'info');
    };
    const onForceMute = (data: any) => {
      if (data?.targetUserId && userRef.current && data.targetUserId !== userRef.current._id) {
        return;
      }
      if (data?.isMuted) {
        toggleMic(false).catch(() => {});
        showToast('The host muted your microphone.', 'info');
      } else {
        toggleMic(true).catch(() => {});
        showToast('The host unmuted your microphone.', 'success');
      }
    };

    socket.on('stream:chat-received', onChat);
    socket.on('stream:gift-received', onGift);
    socket.on('stream:ended', onEnded);
    socket.on('stream:like-received', onLike);
    socket.on('stream:like-count', onLikeCount);
    socket.on('notification:new', onGiftNotif);
    socket.on('stream:viewer-joined', onViewerJoined);
    socket.on('stream:viewer-left', onViewerLeft);
    socket.on('stream:viewer-count', onViewerCount);

    const onReward = (payload: any) => {
      setNotifications((prev) => [
        ...prev,
        {
          id: `reward-${Date.now()}-${Math.random()}`,
          content: `🎁 ${payload.senderName || 'Host'} rewarded ${Number(payload.amount).toLocaleString()} diamonds to ${payload.receiverName || 'Audience'}!`,
          type: 'gift',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    };
    socket.on('stream:reward-received', onReward);
    const onSocketDisconnect = (reason: string) => {
      if (reason === 'io client disconnect') return;
      handleNetworkLost();
    };
    const onSocketConnect = () => {
      handleNetworkRecover();
    };

    socket.on('disconnect', onSocketDisconnect);
    socket.on('connect', onSocketConnect);
    socket.on('stream:top-gifters', onTopGifters);
    socket.on('stream:speakers-update', onSpeakersUpdate);
    socket.on('stream:mic:requested', onMicRequested);
    socket.on('stream:mic:response', onMicResponse);
    socket.on('stream:mic:kicked', onMicKicked);
    socket.on('stream:mic:force-mute', onForceMute);

    // PK Battle socket events
    const onPkInvite = (data: any) => {
      setPendingPkInvite(data);
    };

    const onPkStart = (data: any) => {
      setPendingPkInvite(null);
      setPkBattle(data);
      showToast('PK Battle Started! ⚔️', 'success');
    };

    const onPkScore = (data: any) => {
      setPkBattle((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          scoreA: data.scoreA,
          scoreB: data.scoreB,
          hostA: { ...prev.hostA, score: data.scoreA },
          hostB: { ...prev.hostB, score: data.scoreB },
          recentGifts: [...(prev.recentGifts || []), data.recentGift].filter(Boolean).slice(-8),
        };
      });
    };

    const onPkEnd = (data: any) => {
      showToast(
        data.winnerSide === 'tie'
          ? 'PK Battle Ended: It’s a tie!'
          : `PK Battle Ended: Host ${data.winnerSide} won!`,
        'info'
      );
      setPkBattle((prev: any) => (prev ? { ...prev, isFinished: true, winner: data.winnerSide } : null));
    };

    socket.on('pk:live:invite', onPkInvite);
    socket.on('pk:live:start', onPkStart);
    socket.on('pk:live:score', onPkScore);
    socket.on('pk:live:end', onPkEnd);

    return () => {
      leaveRoom(`stream:${id}`);
      socket.off('disconnect', onSocketDisconnect);
      socket.off('connect', onSocketConnect);
      socket.off('stream:chat-received', onChat);
      socket.off('stream:gift-received', onGift);
      socket.off('stream:ended', onEnded);
      socket.off('stream:like-received', onLike);
      socket.off('stream:like-count', onLikeCount);
      socket.off('notification:new', onGiftNotif);
      socket.off('stream:viewer-joined', onViewerJoined);
      socket.off('stream:viewer-left', onViewerLeft);
      socket.off('stream:viewer-count', onViewerCount);
      socket.off('stream:reward-received', onReward);
      socket.off('stream:top-gifters', onTopGifters);
      socket.off('stream:speakers-update', onSpeakersUpdate);
      socket.off('stream:mic:requested', onMicRequested);
      socket.off('stream:mic:response', onMicResponse);
      socket.off('stream:mic:kicked', onMicKicked);
      socket.off('stream:mic:force-mute', onForceMute);
      socket.off('pk:live:invite', onPkInvite);
      socket.off('pk:live:start', onPkStart);
      socket.off('pk:live:score', onPkScore);
      socket.off('pk:live:end', onPkEnd);
    };
  }, [socket, id]);

  const handleLike = useCallback(() => {
    const currentUser = userRef.current;
    if (socket && id) {
      socket.emit('stream:like', {
        streamId: id,
        nickname: currentUser?.nickname,
        avatar: currentUser?.avatar,
      });
    }
    if (!hasLikedRef.current) {
      hasLikedRef.current = true;
      gamesApi.recordProgress('likes', 1).catch(() => {});
    }
  }, [socket, id]);

  const handleChat = useCallback((message: string) => {
    if (!socket || !id) return;
    socket.emit('stream:chat', { streamId: id, message });
    gamesApi.recordProgress('chat_sent', 1).catch(() => {});
    // Optimistic local echo so the sender sees their own message immediately
    const currentUser = userRef.current;
    if (currentUser) {
      setChatMessages((prev) => [
        ...prev,
        { userId: currentUser._id, nickname: currentUser.nickname, avatar: currentUser.avatar, message },
      ]);
    }
  }, [socket, id]);

  const handleRequestMic = useCallback(() => {
    if (!socket || !id) return;
    setMicRequestPending(true);
    socket.emit('stream:mic:request', { streamId: id });
    showToast('Mic request sent to the host', 'info');
  }, [socket, id, showToast]);

  const handleAcceptMicRequest = useCallback((requester: MicRequester) => {
    if (!socket || !id) return;
    socket.emit('stream:mic:respond', {
      streamId: id,
      requesterUserId: requester.userId,
      requesterId: requester.userId,
      approved: true,
      approve: true,
    });
    setPendingMicRequester(null);
    showToast(`Accepted mic request from ${requester.nickname}`, 'success');
  }, [socket, id, showToast]);

  const handleDeclineMicRequest = useCallback((requester: MicRequester) => {
    if (!socket || !id) return;
    socket.emit('stream:mic:respond', {
      streamId: id,
      requesterUserId: requester.userId,
      requesterId: requester.userId,
      approved: false,
      approve: false,
    });
    setPendingMicRequester(null);
    showToast(`Declined mic request from ${requester.nickname}`, 'info');
  }, [socket, id, showToast]);

  const handleMuteSpeaker = useCallback((targetUserId: string, targetMuted: boolean) => {
    if (!socket || !id) return;
    if (userRef.current && targetUserId === userRef.current._id) {
      toggleMic(!targetMuted).catch(() => {});
    }
    socket.emit('stream:mic:toggle', { streamId: id, targetUserId, isMuted: targetMuted });
    showToast(targetMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }, [socket, id, toggleMic, showToast]);

  const handleKickSpeaker = useCallback((targetUserId: string) => {
    if (!socket || !id || !isHostRef.current) return;
    socket.emit('stream:mic:kick', { streamId: id, targetUserId });
    showToast('Removed speaker from microphone', 'info');
  }, [socket, id, showToast]);

  const handleToggleMic = useCallback(async () => {
    const nextState = !micOn;
    await toggleMic(nextState);
    if (socket && id && (isSpeaker || isHost)) {
      socket.emit('stream:mic:toggle', { streamId: id, isMuted: !nextState });
    }
  }, [micOn, toggleMic, socket, id, isSpeaker, isHost]);

  const handleOpenGiftToUser = useCallback((targetUserId: string) => {
    setCustomGiftReceiverId(targetUserId);
    setShowGift(true);
  }, []);

  const handleSendGift = async (gift: GiftType, quantity: number) => {
    // Block double-send while a request is in flight
    if (sendingGiftRef.current) return;
    sendingGiftRef.current = true;
    const receiverId = customGiftReceiverId || giftReceiverId;
    if (!receiverId) {
      sendingGiftRef.current = false;
      showToast('Recipient unavailable', 'error');
      return;
    }
    if (user && receiverId === user._id) {
      sendingGiftRef.current = false;
      showToast('You cannot send a gift to yourself', 'error');
      return;
    }
    try {
      const { data } = await giftsApi.send(receiverId, gift._id, quantity);
      // Reflect the sender's updated coin balance immediately
      if (data.success) {
        if (data.data?.senderCoins != null) {
          updateUser({
            coins: data.data.senderCoins,
            diamonds: data.data.senderDiamonds ?? user?.diamonds,
          });
        } else if (data.data?.senderBalance != null) {
          updateUser({ coins: data.data.senderBalance });
        }
      }
      if (socket && id) socket.emit('stream:gift', { streamId: id, gift, count: quantity, receiverId });
      gamesApi.recordProgress('gift_sent', quantity).catch(() => {});
      // Optimistic local gift message for the sender
      const currentUser = userRef.current;
      if (currentUser) {
        setChatMessages((prev) => [
          ...prev,
          {
            userId: currentUser._id,
            nickname: currentUser.nickname,
            avatar: currentUser.avatar,
            message: `Sent ${quantity > 1 ? `${quantity}x ` : ''}${gift.name}!`,
            isGift: true,
            gift,
            count: quantity,
          },
        ]);
      }

      // Immediately trigger pop-up animation and floating gifts for the sender
      setGiftBurst({
        id: `${Date.now()}-${Math.random()}`,
        gift,
        count: quantity,
        nickname: currentUser?.nickname || 'You',
      });
      if (burstTimer.current) clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setGiftBurst(null), 5000);

      triggerGifts(gift.icon || (gift as any).animation || '🎁', gift.name, Math.min(quantity, 6));

      const costDiamonds = (gift.priceDiamonds || 0) * quantity;
      showToast(`Sent ${quantity}x ${gift.name}! (-${costDiamonds.toLocaleString()} Diamonds)`, 'success');
      setShowGift(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send gift', 'error');
      throw err; // rethrow so the panel can show inline feedback
    } finally {
      sendingGiftRef.current = false;
    }
  };

  // End/Leave request handlers (show confirmation dialogs)
  // host is the populated object form; when hostId is null/string (orphaned ref),
  // fall back to the logged-in user's identity so the host card still shows a name.
  const host = stream && stream.hostId && typeof stream.hostId !== 'string'
    ? stream.hostId
    : isHost && user
      ? { _id: user._id, uid: user.uid, nickname: user.nickname, avatar: user.avatar, level: user.level, isAgent: !!user.isAgent }
      : null;

  const [isClosing, setIsClosing] = useState(false);

  const confirmLeaveStream = useCallback(() => {
    setShowLeaveConfirm(false);
    setIsClosing(true);
    navigatingAwayRef.current = true;
    endedRef.current = true;
    closeStream();
    onCloseProp?.();
    if (id) fireEnd();
    navigate('/', { replace: true });
  }, [id, fireEnd, navigate, closeStream, onCloseProp]);

  const confirmEndStream = useCallback(async () => {
    setShowEndConfirm(false);
    endedRef.current = true;

    const titlePicture = stream?.cover || stream?.thumbnail || (stream as any)?.coverImage;
    const profilePicture = host?.avatar || user?.avatar;
    const resolvedImage = titlePicture ? getMediaUrl(titlePicture) : (profilePicture ? getMediaUrl(profilePicture) : undefined);

    const recap = {
      duration: formatRecapDuration(elapsedRef.current),
      viewers: Math.max(totalViewersRef.current, peakViewersRef.current, stream?.viewerCount || 0, 1),
      likes: likeCount,
      hostName: host?.nickname || user?.nickname || 'Streamer',
      hostAvatar: resolvedImage,
      image: resolvedImage,
      isHost: true,
    };

    // If host was minimized, close player immediately
    if (isMinimized) {
      setIsClosing(true);
      closeStream();
      onCloseProp?.();
    } else {
      setMinimized(false);
      // Set recap IMMEDIATELY so no connecting / skeleton screen flashes!
      setStreamEndedRecap(recap);
    }

    // Clean up Agora and session safely in background
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      await leaveChannel();
    } catch (e) {
      console.warn('[LiveStream] leaveChannel error:', e);
    }

    try {
      if (id) {
        await streamsApi.endStream(id);
      }
    } catch (e) {
      console.warn('[LiveStream] endStream API error:', e);
    }

    try {
      if (socket && id) {
        socket.emit('stream:ended', { streamId: id });
        socket.emit('stream:leave', { streamId: id });
      }
    } catch (e) {
      console.warn('[LiveStream] socket end error:', e);
    }
  }, [id, leaveChannel, socket, likeCount, stream, host, user, isMinimized, setMinimized, closeStream, onCloseProp]);

  const requestEndStream = useCallback(() => {
    if (isMinimized) {
      confirmEndStream();
      return;
    }
    setShowEndConfirm(true);
  }, [isMinimized, confirmEndStream]);

  const requestLeaveStream = useCallback(() => {
    if (isMinimized) {
      confirmLeaveStream();
      return;
    }
    setShowLeaveConfirm(true);
  }, [isMinimized, confirmLeaveStream]);

  const handleMinimize = useCallback(() => {
    if (onMinimizeProp) {
      onMinimizeProp();
    } else {
      setMinimized(true);
      navigate(-1);
    }
  }, [onMinimizeProp, setMinimized, navigate]);

  const handleMaximize = useCallback(() => {
    if (onMaximizeProp) {
      onMaximizeProp();
    } else {
      setMinimized(false);
      if (id) navigate(`/live/${id}`);
    }
  }, [onMaximizeProp, setMinimized, id, navigate]);

  // Robust receiver id for gifts: populated hostId → raw string hostId → host fallback.
  const giftReceiverId =
    (typeof stream?.hostId === 'object' && stream.hostId ? stream.hostId._id : null) ||
    (typeof stream?.hostId === 'string' ? stream.hostId : null) ||
    host?._id ||
    '';

  // Follow state — explicit server-synced (never a blind local toggle).
  const hostTargetId = giftReceiverId || null;
  const { following: isFollowing, busy: followBusy, toggle: handleFollowToggle } = useFollow({
    targetUserId: hostTargetId,
  });

  // Host camera enhancements — filters (local preview)
  const { activeFilter, applyFilter } = useVideoFilters();
  const [showFilters, setShowFilters] = useState(false);

  const handleSelectFilter = (id: string) => {
    applyFilter(id);
    setShowFilters(false);
  };

  if (streamEndedRecap) {
    return (
      <StreamEndedRecap
        duration={streamEndedRecap.duration}
        viewers={streamEndedRecap.viewers}
        likes={streamEndedRecap.likes}
        hostName={streamEndedRecap.hostName}
        hostAvatar={streamEndedRecap.hostAvatar}
        image={streamEndedRecap.image}
        isHost={streamEndedRecap.isHost}
        onGoHome={() => {
          setIsClosing(true);
          closeStream();
          onCloseProp?.();
          navigate('/', { replace: true });
        }}
      />
    );
  }

  const handleAcceptPkInvite = async (battleId: string) => {
    try {
      socket?.emit('pk:live:invite:respond', { battleId, accept: true });
      setPendingPkInvite(null);
    } catch {
      showToast('Failed to accept PK', 'error');
    }
  };

  const handleDeclinePkInvite = async (battleId: string) => {
    try {
      socket?.emit('pk:live:invite:respond', { battleId, accept: false });
      setPendingPkInvite(null);
    } catch {
      showToast('Failed to decline PK', 'error');
    }
  };

  const handleEndPkBattle = async (battleId: string) => {
    try {
      socket?.emit('pk:live:battle:end', { battleId });
    } catch {}
  };

  const handleQuitPkBattle = () => {
    setPkBattle(null);
  };

  const handleSendPkGift = (targetHostId: string, side: 'left' | 'right') => {
    setCustomGiftReceiverId(targetHostId);
    setShowGift(true);
  };

  const handleRewardAudienceUser = async (targetUserId: string, amount: number, note?: string) => {
    try {
      const points = Math.floor(Number(amount));
      if (!points || points <= 0) {
        throw new Error('Please enter a valid diamond amount');
      }

      if ((userRef.current?.diamonds || 0) < points) {
        throw new Error('Insufficient diamond balance');
      }

      let success = false;
      let newBalance: number | undefined;

      // 1. Try real-time stream socket reward for instant live broadcast and atomic diamond credit
      if (socket && socket.connected && id) {
        try {
          const res: any = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 3500);
            socket.emit('stream:reward', { streamId: id, receiverId: targetUserId, amount: points, note }, (ack: any) => {
              clearTimeout(timer);
              resolve(ack);
            });
          });
          if (res && res.success) {
            success = true;
            newBalance = res.balance;
          } else if (res && res.error) {
            throw new Error(res.error);
          }
        } catch (sockErr: any) {
          if (sockErr?.message) throw sockErr;
        }
      }

      // 2. Fallback to direct HTTP transfer API endpoint
      if (!success) {
        const res = await transferApi.transfer(targetUserId, points, 'diamond');
        if (res.data?.success) {
          success = true;
          newBalance = res.data.data.balance;
          if (socket && socket.connected && id) {
            socket.emit('stream:chat', {
              streamId: id,
              message: `🎁 Host rewarded ${points.toLocaleString()} diamonds!`,
            });
          }
        } else {
          throw new Error(res.data?.error?.message || 'Failed to reward diamonds');
        }
      }

      if (typeof newBalance === 'number') {
        updateUser({ diamonds: newBalance });
      } else if (userRef.current?.diamonds !== undefined) {
        updateUser({ diamonds: Math.max(0, userRef.current.diamonds - points) });
      }

      showToast(`Rewarded ${points.toLocaleString()} diamonds to viewer!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reward user', 'error');
      throw err;
    }
  };

  // Prevent rendering LiveRoom / skeleton when closing or navigating away
  if (isClosing || navigatingAwayRef.current || (endedRef.current && !streamEndedRecap)) {
    return null;
  }

  return (
    <div className={isMinimized ? 'contents' : 'h-screen bg-black text-white'}>
      <LiveRoom
        stream={stream}
        streamTitle={stream?.title}
        host={host}
        balance={user ? { coins: user.coins, diamonds: user.diamonds } : undefined}
        user={user}
        isHost={isHost}
        joined={joined}
        videoEnabled={stream?.type !== 'voice'}
        cameraOn={cameraOn}
        micOn={micOn}
        error={error}
        isReconnecting={isReconnecting}
        reconnectCountdown={reconnectCountdown}
        isMinimized={isMinimized}
        onMaximize={handleMaximize}
        onMinimize={handleMinimize}
        elapsed={formatElapsed(elapsed)}
        isFollowing={isFollowing}
        followBusy={followBusy}
        messages={chatMessages}
        notifications={notifications}
        onDismissNotification={(notifId) => setNotifications((prev) => prev.filter((n) => n.id !== notifId))}
        giftBurst={giftBurst}
        onLeave={requestLeaveStream}
        onEnd={requestEndStream}
        onToggleCamera={toggleCamera}
        onToggleMic={handleToggleMic}
        onSwitchCamera={switchCamera}
        onFollowToggle={handleFollowToggle}
        onChatSend={handleChat}
        onOpenGift={() => {
          setCustomGiftReceiverId(null);
          setShowGift(true);
        }}
        onReport={() => setShowReport(true)}
        onHostClick={(h) => {
          if (h?._id) {
            setProfileModalUserId(h._id);
          }
        }}
        likeCount={likeCount}
        onLike={handleLike}
        topGifters={topGifters}
        speakers={speakers}
        isSpeaker={isHost || isSpeaker}
        micRequestPending={micRequestPending}
        onRequestMic={handleRequestMic}
        onMuteSpeaker={handleMuteSpeaker}
        onKickSpeaker={handleKickSpeaker}
        pendingMicRequester={pendingMicRequester}
        onAcceptMicRequest={handleAcceptMicRequest}
        onDeclineMicRequest={handleDeclineMicRequest}
        onOpenGiftToUser={handleOpenGiftToUser}
        filterCss={activeFilter.css !== 'none' ? activeFilter.css : undefined}
        activeFilterId={activeFilter.id}
        onSelectFilter={handleSelectFilter}
        onApplyBeautyEffect={applyBeautyOptions}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        pkBattle={pkBattle}
        pendingPkInvite={pendingPkInvite}
        onAcceptPkInvite={handleAcceptPkInvite}
        onDeclinePkInvite={handleDeclinePkInvite}
        onEndPkBattle={handleEndPkBattle}
        onQuitPkBattle={handleQuitPkBattle}
        onSendPkGift={handleSendPkGift}
        onRewardAudienceUser={handleRewardAudienceUser}
        socket={socket}
        currentStreamId={id}
        localMediaStream={getLocalStream?.()}
      />

      {/* In-Room User Profile Modal (Keeps live stream running) */}
      <UserProfileModal
        userId={profileModalUserId}
        isOpen={!!profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
        onOpenGiftToUser={(targetId) => {
          setCustomGiftReceiverId(targetId);
          setShowGift(true);
        }}
        currentUserId={user?._id}
      />

      {/* Host End Stream Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-auto select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowEndConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#161726]/95 border border-white/15 rounded-3xl p-6 shadow-2xl z-10 text-white flex flex-col gap-4 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">End Live Stream?</h3>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70"
                  aria-label="Close"
                >
                  <span className="text-sm font-bold">✕</span>
                </button>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Are you sure you want to permanently close this live stream? All viewers and speakers will be disconnected.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white/80 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEndStream}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 via-rose-600 to-red-600 hover:from-red-600 hover:to-rose-700 text-sm font-bold text-white shadow-lg shadow-red-500/30 transition-all active:scale-95"
                >
                  Permanently Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewer Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-auto select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowLeaveConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-[#161726]/95 border border-white/15 rounded-3xl p-6 shadow-2xl z-10 text-white flex flex-col gap-4 backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white">Leave Live Stream?</h3>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70"
                  aria-label="Close"
                >
                  <span className="text-sm font-bold">✕</span>
                </button>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Are you sure you want to leave this live room?
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-sm font-semibold text-white/80 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveStream}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all active:scale-95"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gift Modal */}
      <Modal
        isOpen={showGift}
        onClose={() => {
          setShowGift(false);
          setCustomGiftReceiverId(null);
        }}
        title="Send a Gift"
      >
        <GiftPanel receiverId={customGiftReceiverId || giftReceiverId} onSend={handleSendGift} />
      </Modal>

      {/* Report Modal */}
      {showReport && id && (
        <ReportModal targetType="stream" targetId={id} onClose={() => setShowReport(false)} />
      )}

      {/* Floating gift animations across the screen */}
      <FloatingGifts items={floatingGiftItems} />
    </div>
  );
};
