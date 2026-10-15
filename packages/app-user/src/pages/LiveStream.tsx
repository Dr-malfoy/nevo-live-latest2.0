import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { streamsApi, giftsApi } from '../api';
import { gamesApi } from '../api/economy.api';
import { useSocketStore, useAuthStore, useUIStore } from '../stores';
import { GiftPanel } from '../components/stream';
import { Modal } from '../components/ui';
import { ReportModal } from '../components/report/ReportModal';
import { LiveRoom } from '../components/live';
import type { RoomMessage, RoomNotification, TopGifterItem, LiveSpeakerItem, MicRequester } from '../components/live';
import { useFloatingGifts, FloatingGifts } from '../components/party/FloatingGifts';
import { useAgora } from '../hooks/useAgora';
import { useFollow } from '../hooks/useFollow';
import { useVideoFilters } from '../hooks/useVideoFilters';
import { registerLiveSession, endLiveSession } from '../services/liveSession';
import type { LiveStream, Gift as GiftType } from '../types';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';
const NETWORK_GRACE_MS = 10_000; // 10s grace before auto-ending on network loss
const HEARTBEAT_INTERVAL_MS = 15_000;

export const LiveStreamPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
  const burstTimer = useRef<ReturnType<typeof setTimeout>>();
  const { items: floatingGiftItems, triggerGifts } = useFloatingGifts();
  const sendingGiftRef = useRef(false);
  const isHostRef = useRef(false);
  const endedRef = useRef(false);
  const tokenRef = useRef('');
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
    toggleCamera,
    toggleMic,
    switchCamera,
    leaveChannel,
  } = useAgora();

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
        if (isHostRef.current) navigate('/', { replace: true });
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

  // Network grace: auto-end after 10s of disconnect unless connection recovers
  const handleNetworkLost = useCallback(() => {
    if (networkTimerRef.current) return;
    networkTimerRef.current = setTimeout(() => {
      showToast('Connection lost — ending live session', 'error');
      fireEnd();
    }, NETWORK_GRACE_MS);
  }, [fireEnd, showToast]);

  const handleNetworkRecover = useCallback(() => {
    if (networkTimerRef.current) {
      clearTimeout(networkTimerRef.current);
      networkTimerRef.current = undefined;
    }
  }, []);

  // Load stream first, then join Agora — ordering ensures isHost is correct before the join effect fires
  useEffect(() => {
    if (!id) return;

    streamsApi.getStream(id).then(({ data }) => {
      if (data.success && data.data) {
        setStream(data.data);
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
          burstTimer.current = setTimeout(() => setGiftBurst(null), 3600);

          triggerGifts(giftObj.icon || giftObj.animation || '🎁', giftObj.name || 'Gift', Math.min(giftCount, 6));
        }
      }
    };
    const onEnded = () => {
      showToast('Stream has ended', 'info');
      endedRef.current = true;
      navigate('/', { replace: true });
    };
    const onLike = () => setLikeCount((c) => c + 1);
    const onGiftNotif = (notif: any) => {
      // In-room toast when the host receives a gift
      if (notif?.type === 'gift') {
        const msg = notif.message || 'You received a gift!';
        setNotifications((prev) => [
          ...prev.slice(-4),
          { id: `${Date.now()}-${Math.random()}`, kind: 'gift', text: msg, avatar: notif.data?.senderAvatar },
        ]);
      }
    };

    const onViewerJoined = (msg: any) => {
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
        setStream((prev) => (prev ? { ...prev, viewerCount: Math.max(0, msg.viewerCount) } : prev));
      } else {
        setStream((prev) => (prev ? { ...prev, viewerCount: (prev.viewerCount || 0) + 1 } : prev));
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
      setMicRequestPending(false);
      if (data?.approved) {
        setIsSpeaker(true);
        showToast(data.message || 'The host accepted your speak request!', 'success');
        toggleMic(true).catch(() => {});
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

    socket.on('stream:chat-received', onChat);
    socket.on('stream:gift-received', onGift);
    socket.on('stream:ended', onEnded);
    socket.on('stream:like-received', onLike);
    socket.on('notification:new', onGiftNotif);
    socket.on('stream:viewer-joined', onViewerJoined);
    socket.on('stream:viewer-left', onViewerLeft);
    socket.on('stream:viewer-count', onViewerCount);
    socket.on('stream:top-gifters', onTopGifters);
    socket.on('stream:speakers-update', onSpeakersUpdate);
    socket.on('stream:mic:requested', onMicRequested);
    socket.on('stream:mic:response', onMicResponse);
    socket.on('stream:mic:kicked', onMicKicked);

    return () => {
      leaveRoom(`stream:${id}`);
      socket.off('stream:chat-received', onChat);
      socket.off('stream:gift-received', onGift);
      socket.off('stream:ended', onEnded);
      socket.off('stream:like-received', onLike);
      socket.off('notification:new', onGiftNotif);
      socket.off('stream:viewer-joined', onViewerJoined);
      socket.off('stream:viewer-left', onViewerLeft);
      socket.off('stream:viewer-count', onViewerCount);
      socket.off('stream:top-gifters', onTopGifters);
      socket.off('stream:speakers-update', onSpeakersUpdate);
      socket.off('stream:mic:requested', onMicRequested);
      socket.off('stream:mic:response', onMicResponse);
      socket.off('stream:mic:kicked', onMicKicked);
    };
  }, [socket, id]);

  const handleLike = useCallback(() => {
    if (socket && id) socket.emit('stream:like', { streamId: id });
    gamesApi.recordProgress('likes', 1).catch(() => {});
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
      approve: false,
    });
    setPendingMicRequester(null);
    showToast(`Declined mic request from ${requester.nickname}`, 'info');
  }, [socket, id, showToast]);

  const handleMuteSpeaker = useCallback((targetUserId: string, targetMuted: boolean) => {
    if (userRef.current && targetUserId === userRef.current._id) {
      toggleMic(!targetMuted).catch(() => {});
      if (socket && id) {
        socket.emit('stream:mic:toggle', { streamId: id, isMuted: targetMuted });
      }
    }
  }, [socket, id, toggleMic]);

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
      if (socket && id) socket.emit('stream:gift', { streamId: id, gift, count: quantity });
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
      burstTimer.current = setTimeout(() => setGiftBurst(null), 3600);

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

  // End/Leave → centralized idempotent cleanup
  const handleEndStream = useCallback(() => {
    if (!id) return;
    fireEnd();
  }, [id, fireEnd]);

  const handleLeave = useCallback(() => {
    if (!id) return;
    fireEnd();
  }, [id, fireEnd]);

  // host is the populated object form; when hostId is null/string (orphaned ref),
  // fall back to the logged-in user's identity so the host card still shows a name.
  const host = stream && stream.hostId && typeof stream.hostId !== 'string'
    ? stream.hostId
    : isHost && user
      ? { _id: user._id, uid: user.uid, nickname: user.nickname, avatar: user.avatar, level: user.level, isAgent: !!user.isAgent }
      : null;

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

  return (
    <div className="h-screen bg-black text-white">
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
        elapsed={formatElapsed(elapsed)}
        isFollowing={isFollowing}
        followBusy={followBusy}
        messages={chatMessages}
        notifications={notifications}
        giftBurst={giftBurst}
        onLeave={handleLeave}
        onEnd={handleEndStream}
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
          navigatingAwayRef.current = true;
          navigate(`/user/${h._id}`);
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
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
      />

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
