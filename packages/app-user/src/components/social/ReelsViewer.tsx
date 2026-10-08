import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiHeartFill as Heart,
  PiChatCircleFill as MessageCircle,
  PiShareNetworkFill as Share2,
  PiSpeakerHighFill as VolumeUp,
  PiSpeakerSlashFill as VolumeMute,
  PiPlayFill as Play,
  PiPauseFill as Pause,
  PiPlusBold as Plus,
  PiMusicNotesFill as Music,
  PiVideoCameraFill as VideoIcon,
} from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { compactNumber, timeAgo } from '../../lib/time';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';
import { getMediaUrl } from '../../lib/media';
import { momentsApi, usersApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { ShareModal } from './ShareModal';
import { CommentsDrawer } from './CommentsDrawer';
import { EditPostModal } from './EditPostModal';
import {
  PiXBold as X,
  PiTrashBold as TrashIcon,
  PiPencilSimpleBold as EditIcon,
} from 'react-icons/pi';
import type { Moment } from '../../types';

interface ReelsViewerProps {
  moments: Moment[];
  onUpdate?: () => void;
  onOpenCreate?: () => void;
  initialMomentId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const ReelsViewer: React.FC<ReelsViewerProps> = ({
  moments,
  onUpdate,
  onOpenCreate,
  initialMomentId,
  isModal = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  // Filter video / reel posts
  const reelMoments = moments.filter(
    (m) =>
      m.mediaType === 'video' ||
      Boolean(m.videoUrl) ||
      Boolean(m.media?.[0]?.match(/\.(mp4|webm|mov|mkv)$/i))
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Initial active index from initialMomentId
  const getInitialIdx = () => {
    if (!initialMomentId) return 0;
    const foundIdx = reelMoments.findIndex((m) => m._id === initialMomentId);
    return foundIdx >= 0 ? foundIdx : 0;
  };

  const [activeIndex, setActiveIndex] = useState(getInitialIdx);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [doubleTapHearts, setDoubleTapHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Modals state
  const [selectedMomentForShare, setSelectedMomentForShare] = useState<Moment | null>(null);
  const [selectedMomentForComments, setSelectedMomentForComments] = useState<Moment | null>(null);
  const [selectedMomentForEdit, setSelectedMomentForEdit] = useState<Moment | null>(null);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  // Likes tracking state
  const [likesState, setLikesState] = useState<Record<string, { liked: boolean; count: number }>>({});

  // Scroll to initial index on mount
  useEffect(() => {
    if (initialMomentId && containerRef.current) {
      const idx = reelMoments.findIndex((m) => m._id === initialMomentId);
      if (idx >= 0) {
        setActiveIndex(idx);
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = idx * containerRef.current.clientHeight;
          }
        }, 50);
      }
    }
  }, [initialMomentId, reelMoments.length]);

  useEffect(() => {
    const initial: Record<string, { liked: boolean; count: number }> = {};
    reelMoments.forEach((m) => {
      const isLiked =
        currentUser &&
        Array.isArray(m.likes) &&
        m.likes.some((id: any) => {
          const rawId = typeof id === 'object' ? (id._id || id.uid || id?.toString?.()) : id?.toString?.();
          return (
            rawId === currentUser._id?.toString() ||
            rawId === currentUser.uid?.toString()
          );
        });

      initial[m._id] = {
        liked: Boolean(isLiked),
        count: m.likes?.length || 0,
      };
    });
    setLikesState(initial);
  }, [moments, currentUser?._id, currentUser?.uid]);

  // Track active item during scroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const itemHeight = el.clientHeight;
    if (itemHeight <= 0) return;
    const newIdx = Math.round(el.scrollTop / itemHeight);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < reelMoments.length) {
      setActiveIndex(newIdx);
    }
  };

  // Play active video and pause others with browser autoplay fallback
  useEffect(() => {
    videoRefs.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === activeIndex) {
        v.currentTime = 0;
        v.muted = isMuted;
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // If unmuted autoplay blocked by browser policy, fallback to muted
            v.muted = true;
            setIsMuted(true);
            v.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          });
      } else {
        v.pause();
      }
    });
  }, [activeIndex, reelMoments.length]);

  const togglePlayActive = () => {
    const v = videoRefs.current[activeIndex];
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
      setShowPlayOverlay(true);
      setTimeout(() => setShowPlayOverlay(false), 800);
    } else {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          v.muted = true;
          setIsMuted(true);
          v.play().catch(() => {});
          setIsPlaying(true);
        });
      setShowPlayOverlay(true);
      setTimeout(() => setShowPlayOverlay(false), 800);
    }
  };

  const toggleGlobalMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRefs.current.forEach((v) => {
      if (v) {
        v.muted = nextMute;
        if (!nextMute && v.paused) {
          v.play().catch(() => {});
        }
      }
    });
  };

  const handleLikeReel = async (moment: Moment) => {
    if (!currentUser) {
      showToast('Please login to like reels', 'error');
      return;
    }

    const current = likesState[moment._id] || {
      liked:
        currentUser &&
        Array.isArray(moment.likes) &&
        moment.likes.some((id: any) => {
          const rawId = typeof id === 'object' ? (id._id || id.uid || id?.toString?.()) : id?.toString?.();
          return (
            rawId === currentUser._id?.toString() ||
            rawId === currentUser.uid?.toString()
          );
        }),
      count: moment.likes?.length || 0,
    };
    const nextLiked = !current.liked;
    const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);

    setLikesState((prev) => ({
      ...prev,
      [moment._id]: { liked: nextLiked, count: nextCount },
    }));

    try {
      const res = await momentsApi.toggleLike(moment._id);
      if (res?.data?.data?.likesCount !== undefined) {
        setLikesState((prev) => ({
          ...prev,
          [moment._id]: { liked: nextLiked, count: res.data.data.likesCount },
        }));
      }
      onUpdate?.();
    } catch {
      // Revert on failure
      setLikesState((prev) => ({
        ...prev,
        [moment._id]: current,
      }));
    }
  };

  let lastTap = 0;
  const handleDoubleTap = (e: React.MouseEvent, moment: Moment) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const heartId = Date.now();
      setDoubleTapHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setDoubleTapHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 900);

      const current = likesState[moment._id];
      if (!current?.liked) {
        handleLikeReel(moment);
      }
    } else {
      togglePlayActive();
    }
    lastTap = now;
  };

  const handleFollowAuthor = async (e: React.MouseEvent, authorId?: string) => {
    e.stopPropagation();
    if (!authorId || !currentUser) {
      if (!currentUser) showToast('Please login to follow', 'error');
      return;
    }
    try {
      await usersApi.toggleFollow(authorId);
      setFollowedMap((prev) => ({ ...prev, [authorId]: true }));
      showToast('Followed creator!', 'success');
    } catch {
      showToast('Could not follow user', 'error');
    }
  };

  const handleDeleteReel = async (momentId: string) => {
    if (!window.confirm('Are you sure you want to delete this reel? This cannot be undone.')) {
      return;
    }
    try {
      await momentsApi.delete(momentId);
      showToast('Reel deleted', 'success');
      onUpdate?.();
    } catch {
      showToast('Failed to delete reel', 'error');
    }
  };

  if (reelMoments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-surface-soft rounded-3xl border border-line m-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center text-accent-500 mb-4 shadow-inner">
          <VideoIcon className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-ink mb-1">No Reels Yet</h3>
        <p className="text-xs text-ink-muted max-w-xs mb-5">
          Be the first creator to share a short reel with the community!
        </p>
        <button
          onClick={onOpenCreate}
          className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-transform active:scale-95 shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create First Reel
        </button>
      </div>
    );
  }

  const activeReel = reelMoments[activeIndex];

  const content = (
    <div className={`relative w-full ${isModal ? 'h-full max-w-md mx-auto' : 'h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-neutral-800'} bg-black select-none`}>
      {/* ── TOP FLOATING BAR ── */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
        {onClose ? (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-lg border border-white/10"
            title="Close Reels"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-black tracking-wide border border-white/10 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Reels</span>
          </div>
        )}

        <button
          onClick={toggleGlobalMute}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-lg border border-white/10"
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? (
            <VolumeMute className="w-4 h-4 text-white/80" />
          ) : (
            <VolumeUp className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory no-scrollbar scroll-smooth"
      >
        {reelMoments.map((moment, idx) => {
          const author = typeof moment.userId === 'object' ? moment.userId : null;
          const isCurrentUser = currentUser && (
            (author?._id && currentUser._id?.toString() === author._id?.toString()) ||
            (author?.uid && currentUser.uid?.toString() === author.uid?.toString()) ||
            (typeof moment.userId === 'string' && currentUser._id?.toString() === moment.userId?.toString())
          );
          const resolveLevel = (u?: any): number => {
            if (!u) return 1;
            const rawLvl = Number(u.level) || 0;
            const wLvl = u.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(u.wealthExp || u.diamonds, u.wealthLevel || rawLvl).level;
            const lLvl = u.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(u.liveStreamMinutes || Math.floor((u.liveStreamSeconds || 0) / 60), rawLvl).level;
            return Math.max(1, rawLvl, wLvl, lLvl);
          };
          const authorName = isCurrentUser ? (currentUser.nickname || author?.nickname || 'User') : (author?.nickname || 'User');
          const authorAvatar = getMediaUrl(isCurrentUser ? (currentUser.avatar || author?.avatar) : author?.avatar);
          const authorLevel = isCurrentUser ? resolveLevel(currentUser) : resolveLevel(author);
          const authorId = author?._id || (isCurrentUser ? currentUser._id : (typeof moment.userId === 'string' ? moment.userId : undefined));
          const rawVideoSrc = moment.videoUrl || moment.media?.[0];
          const videoSrc = getMediaUrl(rawVideoSrc);

          const isFollowed = authorId ? !!followedMap[authorId] : false;
          const likeInfo = likesState[moment._id] || {
            liked: currentUser ? moment.likes?.includes(currentUser._id) : false,
            count: moment.likes?.length || 0,
          };

          const displayedTags = Array.from(
            new Set([
              ...(moment.hashtags || []),
              ...((moment.content?.match(/#(\w+)/g) || []).map((t) => t.replace('#', ''))),
            ])
          );

          return (
            <section
              key={moment._id}
              className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black overflow-hidden"
              onClick={(e) => handleDoubleTap(e, moment)}
            >
              {/* Reel Video Player */}
              {videoSrc ? (
                <video
                  ref={(el) => (videoRefs.current[idx] = el)}
                  src={videoSrc}
                  loop
                  muted={isMuted}
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white/50 text-xs">
                  Video unavailable
                </div>
              )}

              {/* Gradient overlays */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

              {/* Play / Pause Animated Icon */}
              {showPlayOverlay && idx === activeIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center animate-ping">
                    {isPlaying ? (
                      <Play className="w-8 h-8" />
                    ) : (
                      <Pause className="w-8 h-8" />
                    )}
                  </div>
                </div>
              )}

              {/* Double Tap Floating Hearts */}
              {doubleTapHearts.map((heart) => (
                <div
                  key={heart.id}
                  className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
                  style={{ left: heart.x, top: heart.y }}
                >
                  <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                </div>
              ))}

              {/* ── VERTICAL ACTION BAR ON BOTTOM RIGHT ── */}
              <div
                className="absolute right-3.5 bottom-12 z-30 flex flex-col items-center gap-3.5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Creator Avatar with Follow button */}
                <div className="relative mb-1 flex flex-col items-center">
                  <div
                    onClick={() => authorId && navigate(`/user/${authorId}`)}
                    className="cursor-pointer active:scale-95 transition-transform"
                  >
                    <Avatar src={authorAvatar} nickname={authorName} size="md" ringed />
                  </div>
                  {!isFollowed && authorId && authorId !== currentUser?._id && (
                    <button
                      onClick={(e) => handleFollowAuthor(e, authorId)}
                      className="absolute -bottom-2 w-5 h-5 rounded-full bg-role-host text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  )}
                </div>

                {/* 1. React / Like Option */}
                <button
                  onClick={() => handleLikeReel(moment)}
                  className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  aria-label="Like reel"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${
                      likeInfo.liked
                        ? 'bg-rose-500/90 text-white shadow-glow-pink'
                        : 'bg-black/40 text-white hover:bg-black/60'
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        likeInfo.liked ? 'fill-white' : 'text-white'
                      }`}
                    />
                  </div>
                  <span className="text-white text-[11px] font-bold drop-shadow-md tabular-nums">
                    {compactNumber(likeInfo.count)}
                  </span>
                </button>

                {/* 2. Comment Option */}
                <button
                  onClick={() => setSelectedMomentForComments(moment)}
                  className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  aria-label="Comments"
                >
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <span className="text-white text-[11px] font-bold drop-shadow-md tabular-nums">
                    {compactNumber(moment.comments?.length || 0)}
                  </span>
                </button>

                {/* 3. Share Option */}
                <button
                  onClick={() => setSelectedMomentForShare(moment)}
                  className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
                  aria-label="Share reel"
                >
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <span className="text-white text-[11px] font-bold drop-shadow-md tabular-nums">
                    {compactNumber(moment.shareCount || 0)}
                  </span>
                </button>

                {/* Author Options: Edit & Delete if current user */}
                {isCurrentUser && (
                  <>
                    <button
                      onClick={() => setSelectedMomentForEdit(moment)}
                      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 active:scale-90 transition-all"
                      title="Edit Reel"
                    >
                      <EditIcon className="w-4 h-4 text-accent-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteReel(moment._id)}
                      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-rose-400 flex items-center justify-center hover:bg-rose-900/40 active:scale-90 transition-all"
                      title="Delete Reel"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* ── BOTTOM LEFT INFO OVERLAY ── */}
              <div
                className="absolute left-4 right-20 bottom-10 z-20 space-y-2 pointer-events-auto text-left"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Author Info */}
                <div
                  onClick={() => authorId && navigate(`/user/${authorId}`)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-white font-black text-sm tracking-wide drop-shadow-md hover:underline">
                    @{authorName}
                  </span>
                  <VerifiedBadge verification={author?.verification} />
                  <LevelBadge level={authorLevel} size="sm" />
                </div>

                {/* Caption */}
                {moment.content && (
                  <p className="text-white/95 text-xs font-medium leading-relaxed drop-shadow-md line-clamp-2">
                    {moment.content}
                  </p>
                )}

                {/* Tags */}
                {displayedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {displayedTags.map((t) => (
                      <span
                        key={t}
                        className="text-[#9BB4FF] text-[11px] font-bold drop-shadow-sm hover:underline cursor-pointer"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sound Bar / Track Info */}
                <div className="flex items-center gap-2 text-white/80 text-[11px] pt-1">
                  <Music className="w-3.5 h-3.5 animate-spin" />
                  <span className="truncate max-w-[170px] drop-shadow-sm">
                    {authorName}'s Original Audio • {timeAgo(moment.createdAt)}
                  </span>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Share Modal */}
      {selectedMomentForShare && (
        <ShareModal
          isOpen={Boolean(selectedMomentForShare)}
          onClose={() => setSelectedMomentForShare(null)}
          momentId={selectedMomentForShare._id}
          authorName={
            typeof selectedMomentForShare.userId === 'object'
              ? selectedMomentForShare.userId?.nickname
              : 'User'
          }
          caption={selectedMomentForShare.content}
          thumbnailUrl={getMediaUrl(selectedMomentForShare.videoUrl || selectedMomentForShare.media?.[0])}
          onShareSuccess={() => onUpdate?.()}
        />
      )}

      {/* Comments Drawer */}
      {selectedMomentForComments && (
        <CommentsDrawer
          isOpen={Boolean(selectedMomentForComments)}
          onClose={() => setSelectedMomentForComments(null)}
          momentId={selectedMomentForComments._id}
          comments={selectedMomentForComments.comments || []}
          onCommentAdded={() => {
            onUpdate?.();
          }}
        />
      )}

      {/* Edit Modal */}
      {selectedMomentForEdit && (
        <EditPostModal
          isOpen={Boolean(selectedMomentForEdit)}
          onClose={() => setSelectedMomentForEdit(null)}
          moment={selectedMomentForEdit}
          onSuccess={() => {
            onUpdate?.();
            setSelectedMomentForEdit(null);
          }}
        />
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
        {content}
      </div>
    );
  }

  return content;
};
