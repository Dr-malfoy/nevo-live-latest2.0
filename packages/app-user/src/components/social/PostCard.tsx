import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiHeartFill as Heart,
  PiChatCircleFill as MessageCircle,
  PiShareNetworkFill as Share2,
  PiDotsThreeBold as MoreDots,
  PiPlayFill as Play,
  PiPauseFill as Pause,
  PiSpeakerHighFill as VolumeUp,
  PiSpeakerSlashFill as VolumeMute,
  PiArrowsOutSimpleBold as Fullscreen,
  PiFlagFill as Flag,
  PiCopyBold as Copy,
  PiPencilSimpleBold as EditIcon,
  PiTrashBold as TrashIcon,
  PiEyeSlashBold as EyeSlashIcon,
  PiFilmReelFill as ReelsIcon,
  PiEyeFill as EyeIcon,
  PiVideoCameraFill as VideoIcon,
} from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { momentsApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { timeAgo, compactNumber } from '../../lib/time';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';
import { getMediaUrl } from '../../lib/media';
import { ReportModal } from '../report/ReportModal';
import { ShareModal } from './ShareModal';
import { CommentsDrawer } from './CommentsDrawer';
import { EditPostModal } from './EditPostModal';
import { ReactionsModal } from './ReactionsModal';
import { ImageLightboxModal } from '../ui';
import type { Moment } from '../../types';

interface PostCardProps {
  moment: Moment;
  onUpdate?: () => void;
  onHidePost?: (momentId: string) => void;
  onWatchReel?: (momentId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  moment,
  onUpdate,
  onHidePost,
  onWatchReel,
}) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  // States
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // Helper to check if current user liked
  const checkIsLiked = (likes?: any[]) => {
    if (!currentUser || !Array.isArray(likes)) return false;
    return likes.some((id: any) => {
      const rawId = typeof id === 'object' ? (id._id || id.uid || id?.toString?.()) : id?.toString?.();
      return (
        rawId === currentUser._id?.toString() ||
        rawId === currentUser.uid?.toString()
      );
    });
  };

  // Likes state synced with moment.likes
  const [isLiked, setIsLiked] = useState(() => checkIsLiked(moment.likes));
  const [likesCount, setLikesCount] = useState(moment.likes?.length || 0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // Sync state whenever moment or currentUser updates (e.g. from socket)
  useEffect(() => {
    setIsLiked(checkIsLiked(moment.likes));
    setLikesCount(moment.likes?.length || 0);
  }, [moment.likes, currentUser?._id, currentUser?.uid]);

  // Video playback states
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);

  // Share count synced with moment.shareCount
  const [sharesCount, setSharesCount] = useState(moment.shareCount || 0);
  useEffect(() => {
    setSharesCount(moment.shareCount || 0);
  }, [moment.shareCount]);

  // Views count synced with moment.viewCount
  const [viewsCount, setViewsCount] = useState(moment.viewCount || 0);
  const hasRecordedView = useRef(false);
  useEffect(() => {
    setViewsCount(moment.viewCount || 0);
  }, [moment.viewCount]);

  const handleRecordView = () => {
    if (hasRecordedView.current) return;
    hasRecordedView.current = true;
    setViewsCount((v) => v + 1);
    momentsApi.recordView(moment._id).catch(() => {});
  };

  // Robust level resolver
  const resolveLevel = (u?: any): number => {
    if (!u) return 1;
    const rawLvl = Number(u.level) || 0;
    const wLvl = u.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(u.wealthExp || u.diamonds, u.wealthLevel || rawLvl).level;
    const lLvl = u.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(u.liveStreamMinutes || Math.floor((u.liveStreamSeconds || 0) / 60), rawLvl).level;
    return Math.max(1, rawLvl, wLvl, lLvl);
  };

  // Identify author & media
  const author = typeof moment.userId === 'object' ? moment.userId : null;
  const isCurrentUser = currentUser && (
    (author?._id && currentUser._id?.toString() === author._id?.toString()) ||
    (author?.uid && currentUser.uid?.toString() === author.uid?.toString()) ||
    (typeof moment.userId === 'string' && currentUser._id?.toString() === moment.userId?.toString())
  );
  const authorName = isCurrentUser ? (currentUser.nickname || author?.nickname || 'User') : (author?.nickname || 'User');
  const authorAvatar = isCurrentUser ? (currentUser.avatar || author?.avatar) : author?.avatar;
  const authorLevel = isCurrentUser ? resolveLevel(currentUser) : resolveLevel(author);
  const authorId = author?._id || (isCurrentUser ? currentUser._id : (typeof moment.userId === 'string' ? moment.userId : undefined));

  const rawMediaSrc = moment.videoUrl || (moment.media && moment.media[0]);
  const mediaSrc = getMediaUrl(rawMediaSrc);
  const isVideo =
    moment.mediaType === 'video' ||
    Boolean(moment.videoUrl) ||
    Boolean(rawMediaSrc?.match(/\.(mp4|webm|mov|mkv)$/i));

  // Like handler with lively instant feedback
  const handleLike = async () => {
    if (!currentUser) {
      showToast('Please login to like posts', 'error');
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);

    try {
      const res = await momentsApi.toggleLike(moment._id);
      if (res?.data?.data?.likesCount !== undefined) {
        setLikesCount(res.data.data.likesCount);
      }
      onUpdate?.();
    } catch {
      // Revert on error
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  // Double tap to like on media
  let lastTap = 0;
  const handleMediaDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) {
        handleLike();
      }
      setShowDoubleTapHeart(true);
      setTimeout(() => setShowDoubleTapHeart(false), 800);
    }
    lastTap = now;
  };

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      handleRecordView();
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const progress =
      (videoRef.current.currentTime / (videoRef.current.duration || 1)) * 100;
    setVideoProgress(progress);
  };

  const openProfile = () => {
    if (authorId) navigate(`/user/${authorId}`);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/social?post=${moment._id}`;
    navigator.clipboard.writeText(link);
    showToast('Post link copied!', 'success');
    setShowMenu(false);
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      return;
    }
    try {
      await momentsApi.delete(moment._id);
      showToast('Post deleted successfully', 'success');
      onUpdate?.();
    } catch {
      showToast('Failed to delete post', 'error');
    }
  };

  const handleHide = () => {
    setShowMenu(false);
    onHidePost?.(moment._id);
    showToast('Post hidden from your feed', 'info');
  };

  // Extract hashtags or use provided array
  const displayedTags = Array.from(
    new Set([
      ...(moment.hashtags || []),
      ...((moment.content?.match(/#(\w+)/g) || []).map((t) => t.replace('#', ''))),
    ])
  );

  return (
    <article className="bg-white rounded-2xl border border-line shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300">
      {/* ── CARD HEADER ── */}
      <div className="flex items-center justify-between p-3.5 bg-white">
        {/* Author Avatar + Meta */}
        <div
          onClick={openProfile}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
        >
          <div className="relative">
            <Avatar src={authorAvatar} nickname={authorName} size="md" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-online border-2 border-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-ink truncate group-hover:text-accent-500 transition-colors">
                {authorName}
              </span>
              <VerifiedBadge verification={author?.verification} />
              <LevelBadge level={authorLevel} size="sm" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-ink-muted">
                {timeAgo(moment.createdAt)}
              </span>
              <span className="w-1 h-1 rounded-full bg-ink-ghost" />
              <span className="text-[10px] text-accent-500 font-semibold uppercase tracking-wider">
                {isVideo ? 'Video' : 'Photo'}
              </span>
              {isVideo && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ink-ghost" />
                  <span className="text-[11px] text-ink-muted font-medium flex items-center gap-1">
                    <EyeIcon className="w-3 h-3 text-accent-500" />
                    <span>{compactNumber(viewsCount)} views</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* More Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors"
          >
            <MoreDots className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-xl border border-line py-1 z-30 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* If author: show Edit & Delete */}
              {isCurrentUser ? (
                <>
                  <button
                    onClick={() => {
                      setShowEdit(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-ink hover:bg-surface-sunken flex items-center gap-2"
                  >
                    <EditIcon className="w-4 h-4 text-accent-500" /> Edit Post
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" /> Delete Post
                  </button>
                </>
              ) : (
                /* If other user: show Hide & Report */
                <>
                  <button
                    onClick={handleHide}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-ink hover:bg-surface-sunken flex items-center gap-2"
                  >
                    <EyeSlashIcon className="w-4 h-4 text-ink-muted" /> Hide this post
                  </button>
                  <button
                    onClick={() => {
                      setShowReport(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" /> Report Post
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setShowShare(true);
                  setShowMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-ink hover:bg-surface-sunken flex items-center gap-2 border-t border-line/60"
              >
                <Share2 className="w-4 h-4 text-ink-muted" /> Share Post
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-ink hover:bg-surface-sunken flex items-center gap-2"
              >
                <Copy className="w-4 h-4 text-ink-muted" /> Copy Link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── POST CAPTION ── */}
      {moment.content && (
        <div className="px-4 pb-2.5">
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap break-words">
            {moment.content}
          </p>
        </div>
      )}

      {/* ── TAGS / HASHTAGS ── */}
      {displayedTags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {displayedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-600 text-xs font-semibold hover:bg-accent-100 cursor-pointer transition-colors border border-accent-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ── MEDIA SECTION ── */}
      {mediaSrc && (
        isVideo ? (
          <div
            className="relative w-full aspect-video bg-neutral-950 overflow-hidden select-none cursor-pointer flex items-center justify-center group"
            onClick={(e) => {
              if (onWatchReel) {
                onWatchReel(moment._id);
              } else {
                handleMediaDoubleTap(e);
              }
            }}
          >
            {videoError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-white/75 p-6 text-center select-none aspect-video">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-2.5 shadow-inner">
                  <VideoIcon className="w-6 h-6 text-rose-400" />
                </div>
                <span className="text-xs font-bold text-white/90">Video unavailable</span>
                <span className="text-[11px] text-white/45 max-w-xs mt-1">
                  Server restarted or media file was wiped by host storage.
                </span>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={mediaSrc}
                  loop
                  muted={isMuted}
                  playsInline
                  onPlay={handleRecordView}
                  onTimeUpdate={handleTimeUpdate}
                  onError={() => setVideoError(true)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onWatchReel) {
                      handleRecordView();
                      onWatchReel(moment._id);
                    } else {
                      togglePlay();
                    }
                  }}
                  className="w-full h-full object-contain aspect-video"
                />

                {/* Watch Fullscreen Reel Badge Overlay */}
                {Boolean(onWatchReel) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecordView();
                      onWatchReel?.(moment._id);
                    }}
                    className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black/90 active:scale-95 transition-all shadow-lg border border-white/20 z-10"
                  >
                    <ReelsIcon className="w-3.5 h-3.5 text-rose-400" />
                    <span>Watch Reel</span>
                  </button>
                )}

                {/* View Count Badge on Video Overlay */}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg border border-white/20 z-10 pointer-events-none">
                  <EyeIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{compactNumber(viewsCount)} {viewsCount === 1 ? 'view' : 'views'}</span>
                </div>

                {/* Play / Pause Center Overlay Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onWatchReel) {
                      onWatchReel(moment._id);
                    } else {
                      togglePlay();
                    }
                  }}
                  className={`absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-all duration-200 ${
                    isPlaying
                      ? 'opacity-0 group-hover:opacity-90 scale-90'
                      : 'opacity-100 scale-100 shadow-xl'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 translate-x-0.5" />
                  )}
                </button>

                {/* Top Controls: Mute + Fullscreen Reel */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md"
                  >
                    {isMuted ? (
                      <VolumeMute className="w-4 h-4" />
                    ) : (
                      <VolumeUp className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onWatchReel) {
                        onWatchReel(moment._id);
                      } else {
                        handleFullscreen(e);
                      }
                    }}
                    className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-md"
                    title="Watch Fullscreen Reel"
                  >
                    <Fullscreen className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Progress Bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                  <div
                    className="h-full bg-accent-500 transition-all duration-150"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
              </>
            )}

            {/* Double Tap Floating Heart Animation */}
            {showDoubleTapHeart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
                <Heart className="w-20 h-20 text-rose-500 drop-shadow-2xl" />
              </div>
            )}
          </div>
        ) : (
          /* ── Uncropped Full Ratio Photo Card ── */
          <div
            className="relative w-full max-h-[580px] bg-neutral-900/5 overflow-hidden select-none cursor-pointer flex items-center justify-center group"
            onClick={(e) => {
              const now = Date.now();
              if (now - lastTap < 300) {
                handleMediaDoubleTap(e);
              } else {
                setShowLightbox(true);
              }
              lastTap = now;
            }}
            title="Click to view full picture in original ratio"
          >
            {/* Subtle Ambient Blurred Backdrop to avoid dark bars */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-25 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${mediaSrc})` }}
            />

            {/* The Image: adapts to natural upload ratio without ANY cropping */}
            <img
              src={mediaSrc}
              alt="Post content"
              className="relative z-10 w-full h-auto max-h-[580px] object-contain mx-auto group-hover:scale-[1.01] transition-transform duration-300"
              loading="lazy"
            />

            {/* Floating Full View Badge */}
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shadow-lg z-20 pointer-events-none border border-white/20">
              <Fullscreen className="w-3.5 h-3.5" />
              <span>Full View</span>
            </div>

            {/* Floating Reactions Avatars Badge on Photo */}
            {likesCount > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReactions(true);
                }}
                className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-md text-white flex items-center gap-1.5 shadow-lg z-20 cursor-pointer active:scale-95 transition-all border border-white/20 group/reacts"
                title="See who reacted to this post"
              >
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
                <div className="flex -space-x-1.5 overflow-hidden items-center shrink-0">
                  {(moment.likes || [])
                    .filter((u) => u && typeof u === 'object')
                    .slice(0, 3)
                    .map((u: any, idx: number) => {
                      const avatarSrc = getMediaUrl(u.avatar);
                      return avatarSrc ? (
                        <img
                          key={u._id || idx}
                          src={avatarSrc}
                          alt={u.nickname || 'User'}
                          className="w-4 h-4 rounded-full object-cover ring-1 ring-white/90 shadow-2xs shrink-0"
                        />
                      ) : (
                        <div
                          key={u._id || idx}
                          className="w-4 h-4 rounded-full bg-gradient-to-tr from-accent-500 to-rose-400 ring-1 ring-white/90 flex items-center justify-center text-[7px] font-black text-white shrink-0"
                        >
                          {(u.nickname || 'U').charAt(0).toUpperCase()}
                        </div>
                      );
                    })}
                </div>
                {(likesCount > 3 || (moment.likes?.length || 0) > 3) && (
                  <span className="text-[10px] text-white/90 font-black tracking-widest leading-none px-0.5">
                    ...
                  </span>
                )}
              </div>
            )}

            {/* Double Tap Floating Heart Animation */}
            {showDoubleTapHeart && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
                <Heart className="w-20 h-20 text-rose-500 drop-shadow-2xl" />
              </div>
            )}
          </div>
        )
      )}

      {/* Floating Reaction Pill for text-only moments (if no photo) */}
      {!mediaSrc && likesCount > 0 && (
        <div className="px-4 pb-2 flex items-center">
          <div
            onClick={() => setShowReactions(true)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-sunken hover:bg-line/80 border border-line text-ink cursor-pointer active:scale-95 transition-all shadow-2xs"
            title="See who reacted to this post"
          >
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />
            <div className="flex -space-x-1.5 overflow-hidden items-center shrink-0">
              {(moment.likes || [])
                .filter((u) => u && typeof u === 'object')
                .slice(0, 3)
                .map((u: any, idx: number) => {
                  const avatarSrc = getMediaUrl(u.avatar);
                  return avatarSrc ? (
                    <img
                      key={u._id || idx}
                      src={avatarSrc}
                      alt={u.nickname || 'User'}
                      className="w-4 h-4 rounded-full object-cover ring-1 ring-white shadow-2xs shrink-0"
                    />
                  ) : (
                    <div
                      key={u._id || idx}
                      className="w-4 h-4 rounded-full bg-gradient-to-tr from-accent-500 to-rose-400 ring-1 ring-white flex items-center justify-center text-[7px] font-black text-white shrink-0"
                    >
                      {(u.nickname || 'U').charAt(0).toUpperCase()}
                    </div>
                  );
                })}
            </div>
            {(likesCount > 3 || (moment.likes?.length || 0) > 3) && (
              <span className="text-[10px] text-ink-muted font-black tracking-widest leading-none px-0.5">
                ...
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── CARD FOOTER (ACTIONS) ── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-line bg-surface-soft/40">
        <div className="flex items-center gap-4">
          {/* Reaction / Like Button with clickable count */}
          <div className="flex items-center bg-white/70 rounded-full border border-line/70 p-0.5 shadow-2xs">
            <button
              onClick={handleLike}
              className={`p-1 rounded-full active:scale-90 transition-transform ${
                isLiked
                  ? 'text-rose-500 bg-rose-50'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-sunken'
              }`}
              title={isLiked ? 'Unlike' : 'Like post'}
            >
              <div className="relative flex items-center justify-center">
                <Heart
                  className={`w-4 h-4 transition-all duration-300 ${
                    likeAnim ? 'scale-135 rotate-[-12deg]' : 'scale-100 rotate-0'
                  } ${isLiked ? 'fill-rose-500 text-rose-500 drop-shadow-sm' : 'text-ink-muted'}`}
                />
                {likeAnim && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping pointer-events-none" />
                )}
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowReactions(true);
              }}
              className="text-xs font-bold text-ink-muted hover:text-rose-500 transition-colors pr-2 pl-1 py-1 tabular-nums"
              title="See who reacted"
            >
              {compactNumber(likesCount)}
            </button>
          </div>

          {/* Comment Button (Click to see who commented) */}
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors active:scale-95 bg-white/70 rounded-full border border-line/70 px-2.5 py-1.5 shadow-2xs hover:bg-white"
            title="See who commented"
          >
            <MessageCircle className="w-4 h-4 text-ink-muted" />
            <span className="tabular-nums">{compactNumber(moment.comments?.length || 0)}</span>
          </button>

          {/* Share Button (To Users & Copy Link) */}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-ink-muted hover:text-ink transition-colors active:scale-95 bg-white/70 rounded-full border border-line/70 px-2.5 py-1.5 shadow-2xs hover:bg-white"
            title="Share"
          >
            <Share2 className="w-4 h-4 text-ink-muted" />
            <span className="tabular-nums">{compactNumber(sharesCount)}</span>
          </button>
        </div>

        {/* Views Count Display (Only for Video Posts) */}
        {isVideo && (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted bg-surface-sunken/80 px-2.5 py-1 rounded-full border border-line/60"
            title={`${viewsCount} total video views`}
          >
            <EyeIcon className="w-3.5 h-3.5 text-accent-500" />
            <span className="tabular-nums font-bold text-ink">{compactNumber(viewsCount)}</span>
            <span className="text-[11px] text-ink-muted">{viewsCount === 1 ? 'view' : 'views'}</span>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        momentId={moment._id}
        authorName={authorName}
        caption={moment.content}
        thumbnailUrl={mediaSrc}
        onShareSuccess={() => setSharesCount((s) => s + 1)}
      />

      <CommentsDrawer
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        momentId={moment._id}
        comments={moment.comments || []}
        onCommentAdded={() => {
          onUpdate?.();
        }}
      />

      <ReactionsModal
        isOpen={showReactions}
        onClose={() => setShowReactions(false)}
        momentId={moment._id}
        initialLikes={moment.likes}
        likesCount={likesCount}
      />

      {showLightbox && (
        <ImageLightboxModal
          isOpen={showLightbox}
          imageUrl={mediaSrc}
          title={`${authorName}'s Post`}
          subtitle={timeAgo(moment.createdAt)}
          avatar={authorAvatar}
          nickname={authorName}
          onClose={() => setShowLightbox(false)}
        />
      )}

      {showReport && (
        <ReportModal
          targetType="moment"
          targetId={moment._id}
          onClose={() => setShowReport(false)}
        />
      )}

      {showEdit && (
        <EditPostModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          moment={moment}
          onSuccess={() => onUpdate?.()}
        />
      )}
    </article>
  );
};
