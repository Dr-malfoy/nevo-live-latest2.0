import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiCameraSlashFill as CameraOff, PiCheckBold as Check, PiArrowsOutBold, PiXBold as X, PiSwordBold as Swords } from 'react-icons/pi';
import { TopToolbar } from './TopToolbar';
import { CommentOverlay } from './CommentOverlay';
import { BottomToolbar } from './BottomToolbar';
import { GiftOverlay } from './GiftOverlay';
import { ReactionOverlay, useReactions } from './ReactionOverlay';
import { FloatingHearts, useFloatingHearts } from './FloatingHearts';
import { NotificationOverlay } from './NotificationOverlay';
import { AudienceList, type Viewer } from './AudienceList';
import { LiveSkeleton } from './LiveSkeleton';
import { HostCameraPreview } from './HostCameraPreview';
import { FilterPicker } from './FilterPicker';
import { LiveToolsSheet } from './LiveToolsSheet';
import { TopGifterSeats } from './TopGifterSeats';
import { MicRequestBanner } from './MicRequestBanner';
import { LiveDataModal } from './LiveDataModal';
import { LiveRoomMessengerModal } from './LiveRoomMessengerModal';
import { BeautyModal } from './BeautyModal';
import { PKModal } from './PKModal';
import { PKRankModal } from './PKRankModal';
import { PKBattleView } from './PKBattleView';
import { GiftGalleryModal } from './GiftGalleryModal';
import { AudienceRewardModal } from './AudienceRewardModal';
import { ShareModal } from './ShareModal';
import { useUIStore } from '../../stores';
import type { LiveRoomProps } from './types';

export const LiveRoom = ({
  stream,
  streamTitle,
  host,
  balance,
  user,
  isHost,
  joined,
  videoEnabled,
  cameraOn,
  micOn,
  error,
  isReconnecting,
  reconnectCountdown,
  isMinimized = false,
  onMaximize,
  onMinimize,
  elapsed,
  isFollowing,
  followBusy,
  messages,
  notifications,
  onDismissNotification,
  giftBurst,
  onLeave,
  onEnd,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  onFollowToggle,
  onChatSend,
  onOpenGift,
  onReport,
  onHostClick,
  likeCount,
  onLike,
  topGifters = [],
  speakers = [],
  isSpeaker = false,
  micRequestPending = false,
  onRequestMic,
  onMuteSpeaker,
  onKickSpeaker,
  pendingMicRequester = null,
  onAcceptMicRequest,
  onDeclineMicRequest,
  onOpenGiftToUser,
  filterCss,
  activeFilterId,
  onSelectFilter,
  onApplyBeautyEffect,
  showFilters,
  onToggleFilters,
  pkBattle,
  pendingPkInvite,
  onAcceptPkInvite,
  onDeclinePkInvite,
  onEndPkBattle,
  onQuitPkBattle,
  onSendPkGift,
  onRewardAudienceUser,
  socket,
  currentStreamId,
  localMediaStream,
  facingMode = 'user',
  onSetMirror,
}: LiveRoomProps) => {
  const [showAudience, setShowAudience] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const { hearts, burst } = useFloatingHearts();
  const { items: reactions, trigger: triggerReaction } = useReactions();

  // Tools & Modals State
  const [showLiveData, setShowLiveData] = useState(false);
  const [showMessenger, setShowMessenger] = useState(false);
  const [showBeauty, setShowBeauty] = useState(false);
  const [showPKModal, setShowPKModal] = useState(false);
  const [showPKRank, setShowPKRank] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showGiftGallery, setShowGiftGallery] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Automatically close matchmaking modal when PK Battle begins
  useEffect(() => {
    if (pkBattle) {
      setShowPKModal(false);
      setToolsOpen(false);
    }
  }, [pkBattle]);

  // Beauty, Mirror, Noise Reduction State
  const showToast = useUIStore((s) => s.showToast);
  const [smoothness, setSmoothness] = useState(0);
  const [whitening, setWhitening] = useState(0);
  const [mirrorOn, setMirrorOn] = useState(true);
  const [noiseReductionOn, setNoiseReductionOn] = useState(true);
  const [cameraFitMode, setCameraFitMode] = useState<'cover' | 'contain'>('cover');

  const handleToggleCameraFit = useCallback(() => {
    setCameraFitMode((m) => {
      const next = m === 'cover' ? 'contain' : 'cover';
      showToast(next === 'cover' ? 'Camera Size: Full Screen' : 'Camera Size: Letterbox', 'info');
      return next;
    });
  }, [showToast]);

  const isSideA = pkBattle
    ? (pkBattle.hostA?.userId === user?._id || (currentStreamId ? currentStreamId === pkBattle.streamIdA : pkBattle.streamIdA === stream?._id))
    : true;

  // Directly sets transform: scaleX(-1) on video elements to ensure instant, reliable mirroring on Android WebView & browsers
  const applyVideoMirror = useCallback((mirror: boolean) => {
    const videoArea = document.getElementById('agora-video-area');
    if (videoArea) {
      const elements = videoArea.querySelectorAll('video, .agora_video_player');
      elements.forEach((el: any) => {
        const val = mirror ? 'scaleX(-1)' : 'none';
        el.style.setProperty('transform', val, 'important');
        el.style.setProperty('-webkit-transform', val, 'important');
      });
    }

    // Mirror local container in PK Battle if active
    ['pk-video-left', 'pk-video-right'].forEach((id) => {
      const isLocalSide = (id === 'pk-video-left' && isSideA) || (id === 'pk-video-right' && !isSideA);
      const el = document.getElementById(id);
      if (el) {
        const elements = el.querySelectorAll('video, .agora_video_player');
        elements.forEach((v: any) => {
          const val = isLocalSide && mirror ? 'scaleX(-1)' : 'none';
          v.style.setProperty('transform', val, 'important');
          v.style.setProperty('-webkit-transform', val, 'important');
        });
      }
    });
  }, [isSideA]);

  const handleToggleMirror = useCallback(() => {
    setMirrorOn((m) => {
      const next = !m;
      onSetMirror?.(next);
      // Only front camera mirrors. Back camera must ALWAYS stay normal (not ulta).
      const shouldMirror = isHost && next && facingMode === 'user';
      applyVideoMirror(shouldMirror);
      showToast(next ? 'Camera mirror enabled' : 'Camera mirror disabled', 'info');
      return next;
    });
  }, [showToast, onSetMirror, isHost, applyVideoMirror, facingMode]);

  useEffect(() => {
    // Only front camera mirrors. Back camera must ALWAYS stay in natural orientation (not ulta).
    const shouldMirror = isHost && mirrorOn && facingMode === 'user';
    onSetMirror?.(mirrorOn);
    applyVideoMirror(shouldMirror);

    const t1 = setTimeout(() => applyVideoMirror(shouldMirror), 150);
    const t2 = setTimeout(() => applyVideoMirror(shouldMirror), 350);
    const t3 = setTimeout(() => applyVideoMirror(shouldMirror), 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mirrorOn, facingMode, isHost, isSideA, onSetMirror, applyVideoMirror]);

  // Beauty effect handlers: delegates true skin-smoothing & whitening to Agora GPU processor pipeline
  const handleSmoothnessChange = useCallback((val: number) => {
    setSmoothness(val);
    onApplyBeautyEffect?.(val, whitening);
  }, [whitening, onApplyBeautyEffect]);

  const handleWhiteningChange = useCallback((val: number) => {
    setWhitening(val);
    onApplyBeautyEffect?.(smoothness, val);
  }, [smoothness, onApplyBeautyEffect]);

  const handleResetBeauty = useCallback(() => {
    setSmoothness(0);
    setWhitening(0);
    onApplyBeautyEffect?.(0, 0);
  }, [onApplyBeautyEffect]);

  // Remote filter state synchronized via socket for all room viewers
  const [remoteSmoothness, setRemoteSmoothness] = useState(0);
  const [remoteWhitening, setRemoteWhitening] = useState(0);
  const [remoteFilterCss, setRemoteFilterCss] = useState('');

  // Host broadcasts their filter & beauty settings to the room in real-time
  useEffect(() => {
    if (isHost && socket && stream?._id) {
      socket.emit('stream:filter:update', {
        streamId: stream._id,
        smoothness,
        whitening,
        filterCss: filterCss || '',
      });
    }
  }, [isHost, socket, stream?._id, smoothness, whitening, filterCss]);

  // Viewers listen to the host's filter & beauty settings
  useEffect(() => {
    if (!isHost && socket) {
      const handleRemoteFilter = (data: { streamId?: string; smoothness?: number; whitening?: number; filterCss?: string }) => {
        if (!data) return;
        if (typeof data.smoothness === 'number') setRemoteSmoothness(data.smoothness);
        if (typeof data.whitening === 'number') setRemoteWhitening(data.whitening);
        if (typeof data.filterCss === 'string') setRemoteFilterCss(data.filterCss);
      };

      socket.on('stream:filter:update', handleRemoteFilter);
      return () => {
        socket.off('stream:filter:update', handleRemoteFilter);
      };
    }
  }, [isHost, socket]);

  const activeSmoothness = isHost ? smoothness : remoteSmoothness;
  const activeWhitening = isHost ? whitening : remoteWhitening;
  const activePresetCss = isHost ? filterCss : remoteFilterCss;

  // Effective Video Filters (Combining color filter preset + real-time whitening and skin tone glow)
  const beautyCss = useMemo(() => {
    if (activeSmoothness === 0 && activeWhitening === 0) return '';
    // High-power radiant whitening & porcelain glow:
    // Brightness boosts luminous white tone up to +45%
    // Contrast balances highlights for porcelain glow
    // Saturation adds healthy vibrant skin tone
    const bLevel = activeWhitening > 0 ? 1 + (activeWhitening / 100) * 0.45 : 1;
    const cLevel = (activeWhitening > 0 || activeSmoothness > 0)
      ? Math.max(0.85, 1 - (activeWhitening / 100) * 0.08 - (activeSmoothness / 100) * 0.12)
      : 1;
    const sLevel = activeWhitening > 0 ? 1 + (activeWhitening / 100) * 0.20 : 1;
    // Skin smoothing: subtle soft-focus blur (0.3px to 1px max) to soften pores & blemishes
    const blurPx = activeSmoothness > 0 ? (activeSmoothness / 100) * 0.9 : 0;
    const blurStr = blurPx > 0 ? `blur(${blurPx.toFixed(2)}px)` : '';

    return `brightness(${bLevel.toFixed(3)}) contrast(${cLevel.toFixed(3)}) saturate(${sLevel.toFixed(3)}) ${blurStr}`.trim();
  }, [activeSmoothness, activeWhitening]);

  const combinedFilterCss = useMemo(() => {
    return [activePresetCss, beautyCss].filter(Boolean).join(' ') || undefined;
  }, [activePresetCss, beautyCss]);

  // Apply combined filter directly to the video container AND all internal <video> and player elements
  useEffect(() => {
    const filterValue = combinedFilterCss || 'none';
    const applyToElements = () => {
      const videoArea = document.getElementById('agora-video-area');
      if (videoArea) {
        videoArea.style.setProperty('--live-filter', filterValue);
        videoArea.style.filter = filterValue;
        const elements = videoArea.querySelectorAll('video, .agora_video_player');
        elements.forEach((el: any) => {
          el.style.setProperty('filter', filterValue, 'important');
          el.style.setProperty('-webkit-filter', filterValue, 'important');
        });
      }

      ['pk-video-left', 'pk-video-right'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.style.setProperty('--live-filter', filterValue);
          const vids = el.querySelectorAll('video, .agora_video_player');
          vids.forEach((v: any) => {
            v.style.setProperty('filter', filterValue, 'important');
            v.style.setProperty('-webkit-filter', filterValue, 'important');
          });
        }
      });
    };

    applyToElements();
    const t1 = setTimeout(applyToElements, 100);
    const t2 = setTimeout(applyToElements, 300);
    const t3 = setTimeout(applyToElements, 700);

    const videoArea = document.getElementById('agora-video-area');
    let observer: MutationObserver | null = null;
    if (videoArea && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => applyToElements());
      observer.observe(videoArea, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer?.disconnect();
    };
  }, [combinedFilterCss]);

  // Derive viewer list from chat participants (plus host + self).
  const viewers = useMemo<Viewer[]>(() => {
    const map = new Map<string, Viewer>();
    if (host) {
      map.set(host._id, {
        userId: host._id,
        nickname: host.nickname,
        avatar: host.avatar,
        level: host.level || 1,
        wealthLevel: (host as any)?.wealthLevel || host.level || 1,
        liveLevel: (host as any)?.liveLevel || host.level || 1,
        isVip: (host as any)?.isVip,
      });
    }
    if (user) {
      map.set(user._id, {
        userId: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        level: (user as any)?.level || 1,
        wealthLevel: (user as any)?.wealthLevel || (user as any)?.level || 1,
        liveLevel: (user as any)?.liveLevel || (user as any)?.level || 1,
        isVip: (user as any)?.isVip,
      });
    }
    for (const m of messages) {
      if (m.userId) {
        const existing = map.get(m.userId);
        map.set(m.userId, {
          userId: m.userId,
          nickname: m.nickname,
          avatar: m.avatar,
          level: (m as any)?.level || existing?.level || 1,
          wealthLevel: (m as any)?.wealthLevel || existing?.wealthLevel || (m as any)?.level || 1,
          liveLevel: (m as any)?.liveLevel || existing?.liveLevel || (m as any)?.level || 1,
          isVip: (m as any)?.isVip || existing?.isVip,
        });
      }
    }
    return [...map.values()];
  }, [host, user, messages]);

  const handleLike = () => {
    onLike();
    burst(5);
    triggerReaction('❤️');
  };

  const handleReact = (emoji: string) => {
    triggerReaction(emoji);
    if (emoji === '🔥') burst(3);
  };

  const handleShare = async () => {
    setShowShareModal(true);
  };

  // Live session statistics
  const liveStats = useMemo(() => {
    const giftMsgs = messages.filter((m) => m.isGift);
    const totalGifts = giftMsgs.reduce((acc, m) => acc + (m.count || 1), 0);
    const valuation = giftMsgs.reduce((acc, m) => acc + ((m.gift?.diamondPrice || 10) * (m.count || 1)), 0);
    const uniqueUsers = new Set(messages.map((m) => m.userId).filter(Boolean));
    const totalJoined = Math.max(uniqueUsers.size, viewers.length, stream?.viewerCount || 0, 1);
    const totalLeft = Math.max(0, Math.floor(totalJoined * 0.15));

    return {
      totalJoined,
      totalLeft,
      totalGifts,
      valuation,
      peakViewers: Math.max(stream?.viewerCount || 0, viewers.length, 1),
    };
  }, [messages, viewers.length, stream?.viewerCount]);

  // Top 3 gifts received in this live session (for Gift Gallery)
  const sessionTopGifts = useMemo(() => {
    const giftMap = new Map<string, {
      id: string;
      name: string;
      icon: string;
      count: number;
      totalDiamonds: number;
      topSender?: { userId: string; nickname: string; avatar?: string };
    }>();

    for (const m of messages) {
      if (!m.isGift || !m.gift) continue;
      const gId = m.gift._id || m.gift.name || 'unknown';
      const count = m.count || 1;
      const diamonds = (m.gift.diamondPrice || 10) * count;
      const existing = giftMap.get(gId);
      if (existing) {
        existing.count += count;
        existing.totalDiamonds += diamonds;
        if (m.userId && m.nickname) {
          existing.topSender = {
            userId: m.userId,
            nickname: m.nickname,
            avatar: m.avatar,
          };
        }
      } else {
        giftMap.set(gId, {
          id: gId,
          name: m.gift.name || 'Gift',
          icon: m.gift.icon || m.gift.animation || '🎁',
          count,
          totalDiamonds: diamonds,
          topSender: m.userId
            ? {
                userId: m.userId,
                nickname: m.nickname,
                avatar: m.avatar,
              }
            : undefined,
        });
      }
    }

    return [...giftMap.values()]
      .sort((a, b) => b.totalDiamonds - a.totalDiamonds)
      .slice(0, 3);
  }, [messages]);

  return (
    <motion.div
      drag={isMinimized}
      dragMomentum={false}
      dragConstraints={{
        left: 10,
        right: typeof window !== 'undefined' ? window.innerWidth - 150 : 250,
        top: 60,
        bottom: typeof window !== 'undefined' ? window.innerHeight - 240 : 500,
      }}
      onClick={isMinimized ? onMaximize : undefined}
      className={
        isMinimized
          ? "fixed bottom-20 right-3.5 w-36 h-56 z-50 rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.85)] border-2 border-white/25 bg-[#0B0B0F] cursor-pointer select-none touch-none"
          : "relative w-full h-full min-h-[100dvh] overflow-hidden bg-brand-bg"
      }
      role="region"
      aria-label="Live stream"
    >
      {/* Background ambient cover/avatar poster behind video */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {stream?.cover || host?.avatar ? (
          <img
            src={stream?.cover || host?.avatar}
            alt=""
            className={`w-full h-full object-cover ${
              isMinimized ? 'blur-sm opacity-50' : 'scale-110 blur-2xl opacity-40'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-[#181824]" />
        )}
      </div>

      {/* Agora / WebRTC video renders here — SINGLE DOM NODE, NEVER UNMOUNTS */}
      <div
        id="agora-video-area"
        className="absolute inset-0 w-full h-full z-0 overflow-hidden flex items-center justify-center bg-black/40"
        style={{ filter: combinedFilterCss || filterCss || undefined }}
      />

      {/* Ambient gradient wash over the video (full screen only) */}
      {!isMinimized && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none z-[1]" />
      )}

      {/* Voice room placeholder — audio-only rooms */}
      {joined && !videoEnabled && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
          {isMinimized ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full border-2 border-white/30 overflow-hidden shadow-lg">
                <img src={host?.avatar} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-3 rounded-full bg-brand-primary animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-end gap-1 h-12">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ height: ['40%', '100%', '40%'] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-brand-primary to-brand-secondary"
                  />
                ))}
              </div>
              <p className="text-white/70 text-sm font-medium">Voice room — mic is live</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Mini Window Controls Overlay (shown ONLY when minimized) */}
      {isMinimized && (
        <div className="absolute inset-0 z-20 bg-gradient-to-b from-black/65 via-transparent to-black/85 flex flex-col justify-between p-2 pointer-events-none">
          {/* Top row */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-black text-white tracking-widest uppercase">LIVE</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMaximize?.();
                }}
                aria-label="Maximize stream"
                className="w-6 h-6 rounded-full bg-black/60 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <PiArrowsOutBold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isHost) onEnd();
                  else onLeave();
                }}
                aria-label="Close stream"
                className="w-6 h-6 rounded-full bg-black/60 hover:bg-red-500/80 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom row */}
          <div className="pointer-events-none">
            <p className="text-[11px] font-bold text-white drop-shadow truncate">
              {host?.nickname || stream?.title || 'Live'}
            </p>
          </div>
        </div>
      )}

      {/* Full-screen UI elements (shown ONLY when NOT minimized) */}
      {!isMinimized && (
        <>
          {/* Camera-off placeholder for host (video rooms only) */}
          <AnimatePresence>
            {joined && isHost && videoEnabled && !cameraOn && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0B0F]/95"
              >
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
                  >
                    <CameraOff className="w-10 h-10 text-white/40" />
                  </motion.div>
                  <p className="text-white/50 text-sm font-medium">Camera is off</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* Connecting state (only when not ended) */}
      {!joined && stream?.status !== 'ended' && <LiveSkeleton />}

      {/* Reconnecting Overlay / Banner with Countdown */}
      <AnimatePresence>
        {isReconnecting && (
          <div className="absolute top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none select-none">
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              className="flex items-center gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-[#1c142c]/90 border border-amber-500/40 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)] text-amber-200"
            >
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-amber-100">
                    Reconnecting Live…
                  </span>
                  {typeof reconnectCountdown === 'number' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/30 text-amber-300 text-[11px] font-black tracking-wide">
                      {reconnectCountdown}s
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] text-amber-200/70">
                  {isHost ? 'Network lost — keeping your room alive…' : 'Reconnecting to host…'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RTC connection error pill (general error when not actively reconnecting with countdown) */}
      {error && !isReconnecting && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center px-6 pointer-events-none">
          <p className="text-sm text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-4 py-1.5 backdrop-blur-md">{error}</p>
        </div>
      )}

      {/* Notifications / reactions / hearts / gifts */}
      <NotificationOverlay notifications={notifications} onDismiss={onDismissNotification} durationMs={5000} />
      <ReactionOverlay items={reactions} />
      <FloatingHearts hearts={hearts} />
      <GiftOverlay burst={giftBurst} />

      {/* Host camera state pill (video rooms only) */}
      {joined && isHost && videoEnabled && <HostCameraPreview cameraOn={cameraOn} />}

      <TopToolbar
        host={host}
        title={streamTitle}
        balance={balance}
        isHost={isHost}
        joined={joined}
        elapsed={elapsed}
        viewerCount={Math.max(0, stream?.viewerCount ?? 0)}
        isFollowing={isFollowing}
        followBusy={followBusy}
        onBack={isHost ? onEnd : onLeave}
        onMinimize={onMinimize}
        onFollowToggle={onFollowToggle}
        onShare={handleShare}
        onReport={onReport}
        onViewersClick={() => setShowAudience(true)}
        onHostClick={onHostClick}
      />

      {/* Host Mic Request Popup Banner */}
      {isHost && pendingMicRequester && onAcceptMicRequest && onDeclineMicRequest && (
        <MicRequestBanner
          requester={pendingMicRequester}
          onAccept={onAcceptMicRequest}
          onDecline={onDeclineMicRequest}
        />
      )}

      {/* Top 5 Gifter Showcase & Co-speaker Seats (5 Vertical Slots on the Right) */}
      <TopGifterSeats
        topGifters={topGifters}
        speakers={speakers}
        currentUserId={user?._id}
        isHost={isHost}
        isSpeaker={isSpeaker}
        micRequestPending={micRequestPending}
        onRequestMic={onRequestMic}
        giftBurst={giftBurst}
        onViewProfile={(uid) => {
          if (onHostClick) onHostClick({ _id: uid, nickname: '', avatar: '' } as any);
        }}
        onOpenGiftToUser={onOpenGiftToUser || onOpenGift}
        onMuteSpeaker={onMuteSpeaker}
        onKickSpeaker={onKickSpeaker}
      />

      <CommentOverlay
        messages={messages}
        currentUserId={user?._id}
        onUserClick={(u) => {
          if (onHostClick && u?._id) onHostClick(u as any);
        }}
      />

      <BottomToolbar
        isHost={isHost}
        videoEnabled={videoEnabled}
        cameraOn={cameraOn}
        micOn={micOn}
        isSpeaker={isSpeaker}
        micRequestPending={micRequestPending}
        onRequestMic={onRequestMic}
        isFollowing={isFollowing}
        likeCount={likeCount}
        onLike={handleLike}
        onReact={handleReact}
        elapsed={elapsed}
        onOpenGift={onOpenGift}
        onShare={handleShare}
        onToggleCamera={onToggleCamera}
        onToggleMic={onToggleMic}
        onSwitchCamera={onSwitchCamera}
        onToggleFilters={onToggleFilters}
        onLeave={onLeave}
        onEnd={onEnd}
        onChatSend={onChatSend}
        onOpenMenu={() => setToolsOpen(true)}
        onOpenPK={isHost ? () => setShowPKModal(true) : () => setShowPKRank(true)}
      />

      {/* Camera enhancement pickers (host only) */}
      {isHost && (
        <FilterPicker open={showFilters} activeId={activeFilterId || 'natural'} onSelect={onSelectFilter || (() => {})} onClose={onToggleFilters || (() => {})} />
      )}

      {/* Live tools and features menu sheet */}
      <LiveToolsSheet
        isOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
        isHost={isHost}
        videoEnabled={videoEnabled}
        cameraOn={cameraOn}
        micOn={micOn}
        isSpeaker={isSpeaker}
        micRequestPending={micRequestPending}
        onRequestMic={onRequestMic}
        speakers={speakers}
        pendingMicRequester={pendingMicRequester}
        onAcceptMicRequest={onAcceptMicRequest}
        onDeclineMicRequest={onDeclineMicRequest}
        onMuteSpeaker={onMuteSpeaker}
        onKickSpeaker={onKickSpeaker}
        onToggleCamera={onToggleCamera}
        onToggleMic={onToggleMic}
        onSwitchCamera={onSwitchCamera}
        onToggleFilters={onToggleFilters}
        onOpenGift={onOpenGift}
        onShare={handleShare}
        onReport={onReport}
        onOpenLiveData={() => setShowLiveData(true)}
        onOpenMessenger={() => setShowMessenger(true)}
        onOpenBeauty={() => setShowBeauty(true)}
        onToggleMirror={handleToggleMirror}
        mirrorOn={mirrorOn}
        cameraFitMode={cameraFitMode}
        onToggleCameraFit={handleToggleCameraFit}
        onToggleNoiseReduction={() => setNoiseReductionOn((n) => !n)}
        noiseReductionOn={noiseReductionOn}
        onOpenPK={() => setShowPKModal(true)}
        onOpenPKRank={() => setShowPKRank(true)}
        onOpenRewards={() => setShowRewards(true)}
        onOpenGiftGallery={() => setShowGiftGallery(true)}
      />

      {/* Live Data Analytics Modal */}
      <LiveDataModal
        isOpen={showLiveData}
        open={showLiveData}
        onClose={() => setShowLiveData(false)}
        stats={{
          totalJoined: liveStats.totalJoined,
          usersJoined: liveStats.totalJoined,
          totalLeft: liveStats.totalLeft,
          usersLeft: liveStats.totalLeft,
          totalGifts: liveStats.totalGifts,
          giftsCount: liveStats.totalGifts,
          valuation: liveStats.valuation,
          valuationDiamonds: liveStats.valuation,
          liveTime: elapsed,
          likeCount: likeCount,
          totalLikes: likeCount,
          peakViewers: liveStats.peakViewers,
        }}
        streamTitle={streamTitle || stream?.title}
      />

      {/* Live Room Audience Messenger Modal */}
      <LiveRoomMessengerModal
        isOpen={showMessenger}
        open={showMessenger}
        onClose={() => setShowMessenger(false)}
        viewers={viewers}
        streamTitle={streamTitle || stream?.title}
      />

      {/* Beauty & Filters Controls Modal */}
      <BeautyModal
        isOpen={showBeauty}
        open={showBeauty}
        onClose={() => setShowBeauty(false)}
        smoothness={smoothness}
        onSmoothnessChange={handleSmoothnessChange}
        whitening={whitening}
        onWhiteningChange={handleWhiteningChange}
        mirrorOn={mirrorOn}
        isMirrored={mirrorOn}
        onToggleMirror={handleToggleMirror}
        noiseReductionOn={noiseReductionOn}
        noiseReduction={noiseReductionOn}
        onToggleNoiseReduction={() => setNoiseReductionOn((n) => !n)}
        onReset={handleResetBeauty}
      />

      {/* PK Matchmaking Modal */}
      <PKModal
        isOpen={showPKModal}
        onClose={() => setShowPKModal(false)}
        streamId={stream?._id || ''}
        pkBattle={pkBattle}
        socket={socket}
      />

      {/* Daily PK Ranking Leaderboard Modal */}
      <PKRankModal
        isOpen={showPKRank}
        onClose={() => setShowPKRank(false)}
        currentUserId={user?._id}
      />

      {/* Gift Gallery Top 3 Modal */}
      <GiftGalleryModal
        isOpen={showGiftGallery}
        onClose={() => setShowGiftGallery(false)}
        topGifts={sessionTopGifts}
      />

      {/* Audience Reward Modal */}
      <AudienceRewardModal
        isOpen={showRewards}
        onClose={() => setShowRewards(false)}
        viewers={viewers.filter((v) => v.userId !== user?._id)}
        balance={balance?.diamonds || 0}
        onRewardUser={async (targetId, amount, note, targetName) => {
          if (onRewardAudienceUser) {
            await onRewardAudienceUser(targetId, amount, note, targetName);
          }
        }}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        streamTitle={streamTitle || stream?.title}
        hostName={host?.nickname}
        friends={viewers.filter((v) => v.userId !== user?._id).map((v) => ({
          userId: v.userId,
          nickname: v.nickname,
          avatar: v.avatar,
        }))}
      />

      {/* Incoming PK Invitation Banner */}
      <AnimatePresence>
        {pendingPkInvite && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            className="fixed top-16 inset-x-4 z-[80] max-w-md mx-auto p-4 rounded-3xl bg-gradient-to-r from-purple-900/95 via-indigo-900/95 to-pink-900/95 border-2 border-purple-400 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full border-2 border-purple-300 overflow-hidden bg-purple-950 shrink-0">
                {pendingPkInvite.inviter?.avatar ? (
                  <img
                    src={pendingPkInvite.inviter.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                    {pendingPkInvite.inviter?.nickname?.charAt(0) || 'H'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-300 flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" /> PK Challenge!
                </span>
                <h5 className="text-sm font-extrabold text-white truncate">
                  {pendingPkInvite.inviter?.nickname || 'A Host'}
                </h5>
                <p className="text-[11px] text-white/70">
                  Duration: {pendingPkInvite.durationMinutes || 3} min
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onDeclinePkInvite?.(pendingPkInvite.battleId)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => onAcceptPkInvite?.(pendingPkInvite.battleId)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-xs font-black text-white shadow-lg shadow-purple-500/40 active:scale-95 transition-all"
              >
                Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active PK Battle Full Screen View (Matching Image 2) */}
      {pkBattle && (
        <PKBattleView
          battleId={pkBattle.battleId}
          streamIdA={pkBattle.streamIdA}
          streamIdB={pkBattle.streamIdB}
          currentStreamId={currentStreamId || stream?._id}
          socket={socket}
          localMediaStream={localMediaStream}
          initialDurationSeconds={pkBattle.durationSeconds || (pkBattle.durationMinutes ? pkBattle.durationMinutes * 60 : 180)}
          endsAt={pkBattle.endsAt}
          isBattleFinished={pkBattle.isFinished}
          leftHost={{
            userId: pkBattle.hostA?.userId || pkBattle.hostA?._id || host?._id || '',
            nickname: pkBattle.hostA?.nickname || host?.nickname || 'Host A',
            avatar: pkBattle.hostA?.avatar || host?.avatar,
            level: pkBattle.hostA?.level || host?.level || 1,
            score: pkBattle.hostA?.score ?? pkBattle.scoreA ?? 0,
            viewerCount: typeof stream?.viewerCount === 'number' ? stream.viewerCount : (viewers?.length || 0),
          }}
          rightHost={{
            userId: pkBattle.hostB?.userId || pkBattle.hostB?._id || '',
            nickname: pkBattle.hostB?.nickname || 'Opponent',
            avatar: pkBattle.hostB?.avatar,
            level: pkBattle.hostB?.level || 1,
            score: pkBattle.hostB?.score ?? pkBattle.scoreB ?? 0,
            viewerCount: typeof pkBattle.hostB?.viewerCount === 'number' ? pkBattle.hostB.viewerCount : 0,
          }}
          isHost={isHost}
          currentUserId={user?._id}
          messages={messages}
          onSendMessage={onChatSend}
          onSendGift={(targetHostId, side) => {
            if (onSendPkGift) {
              onSendPkGift(targetHostId, side);
            } else {
              onOpenGift();
            }
          }}
          onEndPK={() => onEndPkBattle?.(pkBattle.battleId)}
          onQuitPK={() => onQuitPkBattle?.(pkBattle.battleId)}
          onLike={onLike}
          likeCount={likeCount}
          recentGifts={pkBattle.recentGifts || []}
          cameraOn={cameraOn}
          micOn={micOn}
          videoEnabled={videoEnabled}
          onToggleCamera={onToggleCamera}
          onToggleMic={onToggleMic}
          onSwitchCamera={onSwitchCamera}
          speakers={speakers}
          isSpeaker={isSpeaker}
          micRequestPending={micRequestPending}
          onRequestMic={onRequestMic}
          onMuteSpeaker={onMuteSpeaker}
          onKickSpeaker={onKickSpeaker}
          pendingMicRequester={pendingMicRequester}
          onAcceptMicRequest={onAcceptMicRequest}
          onDeclineMicRequest={onDeclineMicRequest}
          onOpenTools={() => setToolsOpen(true)}
          onOpenBeauty={() => setShowBeauty(true)}
          onOpenFilters={onToggleFilters}
          onOpenLiveData={() => setShowLiveData(true)}
          onOpenMessenger={() => setShowMessenger(true)}
          onOpenPKRank={() => setShowPKRank(true)}
          onOpenGift={onOpenGift}
          onShare={() => setShowShareModal(true)}
          isMirrored={mirrorOn}
        />
      )}

      <AudienceList
        open={showAudience}
        streamId={stream?._id}
        viewers={viewers}
        onClose={() => setShowAudience(false)}
        onViewerClick={(v) => {
          setShowAudience(false);
          if (onHostClick && v.userId) {
            onHostClick({ _id: v.userId, nickname: v.nickname, avatar: v.avatar } as any);
          }
        }}
      />

      {/* Share toast */}
      <AnimatePresence>
        {shared && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 bg-[#181926]/95 border border-white/20 rounded-2xl shadow-xl flex items-center gap-2 px-4 py-2.5 text-white"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Link copied!</span>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};
