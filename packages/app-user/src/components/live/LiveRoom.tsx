import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiCameraSlashFill as CameraOff, PiCheckBold as Check } from 'react-icons/pi';
import { TopToolbar } from './TopToolbar';
import { CommentOverlay } from './CommentOverlay';
import { BottomToolbar } from './BottomToolbar';
import { GiftOverlay } from './GiftOverlay';
import { ReactionOverlay, useReactions } from './ReactionOverlay';
import { FloatingHearts, useFloatingHearts } from './FloatingHearts';
import { NotificationOverlay } from './NotificationOverlay';
import { PKPanel } from './PKPanel';
import { AudienceList, type Viewer } from './AudienceList';
import { LiveSkeleton } from './LiveSkeleton';
import { HostCameraPreview } from './HostCameraPreview';
import { FilterPicker } from './FilterPicker';
import { StickerPicker, StickerOverlay } from './StickerPicker';
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
  elapsed,
  isFollowing,
  followBusy,
  messages,
  notifications,
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
  filterCss,
  activeFilterId,
  onSelectFilter,
  stickerState,
  showFilters,
  showStickers,
  onToggleFilters,
  onToggleStickers,
}: LiveRoomProps) => {
  const [showAudience, setShowAudience] = useState(false);
  const [shared, setShared] = useState(false);
  const { hearts, burst } = useFloatingHearts();
  const { items: reactions, trigger: triggerReaction } = useReactions();

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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: stream?.title || 'Live Stream', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      /* share dismissed */
    }
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-brand-bg" role="region" aria-label="Live stream">
      {/* Background ambient cover/avatar poster behind video */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {stream?.cover || host?.avatar ? (
          <img
            src={stream?.cover || host?.avatar}
            alt=""
            className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#181824] via-[#121218] to-[#0B0B0F]" />
        )}
      </div>

      {/* Agora / WebRTC video renders here — id contract kept identical */}
      <div
        id="agora-video-area"
        className="absolute inset-0 w-full h-full z-0 overflow-hidden flex items-center justify-center bg-black/40"
        style={{ filter: filterCss || undefined }}
      />

      {/* Ambient gradient wash over the video */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50 pointer-events-none z-[1]" />

      {/* Voice room placeholder — audio-only rooms show a pulsing mic visual */}
      {joined && !videoEnabled && (
        <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
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
        </div>
      )}

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

      {/* Connecting state */}
      {!joined && <LiveSkeleton />}

      {/* RTC connection error pill (network lost / reconnecting) */}
      {error && (
        <div className="absolute top-20 inset-x-0 z-40 flex justify-center px-6 pointer-events-none">
          <p className="text-sm text-red-300 bg-red-500/15 border border-red-500/30 rounded-full px-4 py-1.5 backdrop-blur-md">{error}</p>
        </div>
      )}

      {/* Notifications / reactions / hearts / gifts */}
      <NotificationOverlay notifications={notifications} />
      <ReactionOverlay items={reactions} />
      <FloatingHearts hearts={hearts} />
      <GiftOverlay burst={giftBurst} />

      {/* Host camera state pill (video rooms only) */}
      {joined && isHost && videoEnabled && <HostCameraPreview cameraOn={cameraOn} />}

      {/* Host sticker overlay — above video, below controls */}
      {isHost && stickerState && (
        <div id="sticker-overlay-area" className="absolute inset-0 z-20 pointer-events-none">
          <StickerOverlay {...stickerState} />
        </div>
      )}

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
        onFollowToggle={onFollowToggle}
        onShare={handleShare}
        onReport={onReport}
        onViewersClick={() => setShowAudience(true)}
        onHostClick={onHostClick}
      />

      <CommentOverlay messages={messages} currentUserId={user?._id} />

      <BottomToolbar
        isHost={isHost}
        videoEnabled={videoEnabled}
        cameraOn={cameraOn}
        micOn={micOn}
        isFollowing={isFollowing}
        likeCount={likeCount}
        onLike={handleLike}
        onOpenGift={onOpenGift}
        onShare={handleShare}
        onToggleCamera={onToggleCamera}
        onToggleMic={onToggleMic}
        onSwitchCamera={onSwitchCamera}
        onToggleFilters={onToggleFilters}
        onToggleStickers={onToggleStickers}
        onLeave={onLeave}
        onEnd={onEnd}
        onChatSend={onChatSend}
      />

      {/* Camera enhancement pickers (host only) */}
      {isHost && (
        <>
          <FilterPicker open={showFilters} activeId={activeFilterId || 'natural'} onSelect={onSelectFilter || (() => {})} onClose={onToggleFilters || (() => {})} />
          <StickerPicker open={showStickers} onAdd={stickerState?.addSticker || (() => {})} onClose={onToggleStickers || (() => {})} />
        </>
      )}

      <PKPanel data={null} />

      <AudienceList open={showAudience} streamId={stream?._id} viewers={viewers} onClose={() => setShowAudience(false)} />

      {/* Share toast */}
      <AnimatePresence>
        {shared && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="absolute bottom-40 left-1/2 -translate-x-1/2 z-40 glass-card flex items-center gap-2 px-4 py-2.5"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Link copied!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
