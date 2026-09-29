import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PiPlusBold as Plus,
  PiFilmReelFill as ReelsIcon,
  PiSquaresFourFill as FeedIcon,
  PiImageFill as ImageIcon,
  PiVideoCameraFill as VideoIcon,
  PiMagnifyingGlassBold as Search,
  PiArrowClockwiseBold as Refresh,
  PiSparkleFill as Sparkle,
  PiFireFill as Fire,
} from 'react-icons/pi';
import { momentsApi } from '../api';
import { PostCard, ReelsViewer, CreatePostModal } from '../components/social';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { useAuthStore, useSocketStore } from '../stores';
import type { Moment } from '../types';

type SocialTab = 'feed' | 'reels';
type FilterMode = 'all' | 'video' | 'photo' | 'trending';

export const MomentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);

  // Active tab from URL query param or default to 'feed'
  const initialTab = (searchParams.get('tab') as SocialTab) || 'feed';
  const [activeTab, setActiveTab] = useState<SocialTab>(initialTab);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultType, setCreateDefaultType] = useState<'image' | 'video'>('image');
  const [activeReelModalId, setActiveReelModalId] = useState<string | null>(null);

  // Hidden moments (persisted in localStorage)
  const [hiddenMomentIds, setHiddenMomentIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('nevo_hidden_moments');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleHidePost = (momentId: string) => {
    setHiddenMomentIds((prev) => {
      const updated = Array.from(new Set([...prev, momentId]));
      try {
        localStorage.setItem('nevo_hidden_moments', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Switch tab and sync with searchParams
  const handleTabChange = (tab: SocialTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadMoments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await momentsApi.getFeed(1);
      if (data.success && Array.isArray(data.data)) {
        setMoments(data.data);
      }
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuth) {
      navigate('/login');
      return;
    }
    loadMoments();
  }, [isAuth, loadMoments, navigate]);

  // ── REAL-TIME SOCKET.IO LIVE LISTENERS ──
  useEffect(() => {
    if (!socket) return;

    const handleMomentCreated = (newMoment: Moment) => {
      setMoments((prev) => {
        if (prev.some((m) => m._id === newMoment._id)) return prev;
        return [newMoment, ...prev];
      });
    };

    const handleMomentUpdated = (updatedMoment: Moment) => {
      setMoments((prev) =>
        prev.map((m) => (m._id === updatedMoment._id ? updatedMoment : m))
      );
    };

    const handleMomentLike = (data: {
      momentId: string;
      userId: string;
      liked: boolean;
      likes?: string[];
      likesCount?: number;
    }) => {
      setMoments((prev) =>
        prev.map((m) => {
          if (m._id !== data.momentId) return m;
          let newLikes: any[] = [];
          if (Array.isArray(data.likes)) {
            newLikes = [...data.likes];
          } else {
            const currentLikes = (m.likes || []).map((id: any) =>
              typeof id === 'object' ? (id._id || id.uid || id?.toString?.()) : id?.toString?.()
            );
            if (data.liked && !currentLikes.includes(data.userId)) {
              newLikes = [...currentLikes, data.userId];
            } else if (!data.liked && currentLikes.includes(data.userId)) {
              newLikes = currentLikes.filter((id) => id !== data.userId);
            } else {
              newLikes = [...currentLikes];
            }
          }
          return {
            ...m,
            likes: newLikes,
          };
        })
      );
    };

    const handleMomentComment = (data: { momentId: string; comment: any }) => {
      setMoments((prev) =>
        prev.map((m) => {
          if (m._id !== data.momentId) return m;
          const currentComments = m.comments || [];
          if (currentComments.some((c: any) => c._id && c._id === data.comment._id)) {
            return m;
          }
          return {
            ...m,
            comments: [...currentComments, data.comment],
          };
        })
      );
    };

    const handleMomentShare = (data: { momentId: string; shareCount: number }) => {
      setMoments((prev) =>
        prev.map((m) =>
          m._id === data.momentId
            ? { ...m, shareCount: data.shareCount }
            : m
        )
      );
    };

    const handleMomentDeleted = (data: { momentId: string }) => {
      setMoments((prev) => prev.filter((m) => m._id !== data.momentId));
    };

    socket.on('moment:created', handleMomentCreated);
    socket.on('moment:updated', handleMomentUpdated);
    socket.on('moment:like', handleMomentLike);
    socket.on('moment:comment', handleMomentComment);
    socket.on('moment:share', handleMomentShare);
    socket.on('moment:deleted', handleMomentDeleted);

    return () => {
      socket.off('moment:created', handleMomentCreated);
      socket.off('moment:updated', handleMomentUpdated);
      socket.off('moment:like', handleMomentLike);
      socket.off('moment:comment', handleMomentComment);
      socket.off('moment:share', handleMomentShare);
      socket.off('moment:deleted', handleMomentDeleted);
    };
  }, [socket]);

  // ── AUTO-REFRESH INTERVAL (EVERY 15s & ON WINDOW FOCUS) ──
  useEffect(() => {
    const interval = setInterval(() => {
      momentsApi
        .getFeed(1)
        .then(({ data }) => {
          if (data.success && Array.isArray(data.data)) {
            setMoments(data.data);
          }
        })
        .catch(() => {});
    }, 15000);

    const onFocus = () => {
      momentsApi
        .getFeed(1)
        .then(({ data }) => {
          if (data.success && Array.isArray(data.data)) {
            setMoments(data.data);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Filter moments according to filterMode & exclude hidden moments
  const visibleMoments = moments.filter((m) => !hiddenMomentIds.includes(m._id));

  const filteredMoments = visibleMoments.filter((m) => {
    const isVid =
      m.mediaType === 'video' ||
      Boolean(m.videoUrl) ||
      Boolean(m.media?.[0]?.match(/\.(mp4|webm|mov|mkv)$/i));

    if (filterMode === 'video') return isVid;
    if (filterMode === 'photo') return !isVid;
    if (filterMode === 'trending') return (m.likes?.length || 0) >= 1;
    return true;
  });

  const reelCount = visibleMoments.filter(
    (m) =>
      m.mediaType === 'video' ||
      Boolean(m.videoUrl) ||
      Boolean(m.media?.[0]?.match(/\.(mp4|webm|mov|mkv)$/i))
  ).length;

  return (
    <div className="min-h-screen bg-mesh pb-20 max-w-md mx-auto">
      {/* ── STICKY TOP HEADER ── */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent-600 to-indigo-400 flex items-center justify-center text-white shadow-sm">
              <Sparkle className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-ink">
              Moments
            </h1>
          </div>

          {/* Tab Switcher: Feed vs Reels */}
          <div className="flex items-center p-1 bg-surface-sunken rounded-full border border-line">
            <button
              onClick={() => handleTabChange('feed')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'feed'
                  ? 'bg-black text-white shadow-sm scale-102'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <FeedIcon className="w-3.5 h-3.5" />
              <span>Feed</span>
            </button>
            <button
              onClick={() => handleTabChange('reels')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'reels'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm scale-102'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <ReelsIcon className="w-3.5 h-3.5" />
              <span>Reels</span>
              {reelCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setCreateDefaultType('image');
                setCreateModalOpen(true);
              }}
              className="w-9 h-9 bg-accent-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform hover:bg-accent-600"
              title="Create Post"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Sub-Filters Bar (Only on Feed tab) */}
        {activeTab === 'feed' && (
          <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar border-t border-line/60 bg-surface-soft/40">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === 'all'
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink-muted border border-line hover:text-ink'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setFilterMode('video')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === 'video'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-ink-muted border border-line hover:text-ink'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" /> Videos
            </button>
            <button
              onClick={() => setFilterMode('photo')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === 'photo'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-ink-muted border border-line hover:text-ink'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photos
            </button>
            <button
              onClick={() => setFilterMode('trending')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                filterMode === 'trending'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-ink-muted border border-line hover:text-ink'
              }`}
            >
              <Fire className="w-3.5 h-3.5 text-amber-200" /> Trending
            </button>
          </div>
        )}
      </header>

      {/* ── BODY CONTENT ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28">
          <Loading size="lg" />
          <p className="text-xs text-ink-muted mt-3 font-medium">Loading moments & reels…</p>
        </div>
      ) : activeTab === 'reels' ? (
        /* ── REELS TAB (FULL SCREEN TIKTOK REELS) ── */
        <div className="w-full">
          <ReelsViewer
            moments={visibleMoments}
            onUpdate={() => loadMoments(true)}
            onOpenCreate={() => {
              setCreateDefaultType('video');
              setCreateModalOpen(true);
            }}
          />
        </div>
      ) : (
        /* ── HOME FEED TAB (PHOTOS & VIDEOS) ── */
        <div className="px-3 pt-3 space-y-4">
          {/* Posts Feed */}
          {filteredMoments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-line shadow-sm p-6">
              <div className="w-16 h-16 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-3 text-ink-muted">
                <FeedIcon className="w-8 h-8 text-accent-400" />
              </div>
              <h3 className="text-sm font-bold text-ink mb-1">No moments in this view</h3>
              <p className="text-xs text-ink-muted max-w-xs mx-auto mb-4">
                {filterMode === 'video'
                  ? 'No video posts found. Share your first video!'
                  : filterMode === 'photo'
                  ? 'No photo posts found. Share a photo with your followers!'
                  : 'Be the first to share a moment with everyone!'}
              </p>
              <button
                onClick={() => {
                  setCreateDefaultType(filterMode === 'video' ? 'video' : 'image');
                  setCreateModalOpen(true);
                }}
                className="px-5 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-neutral-800 transition-transform active:scale-95 shadow-sm"
              >
                Create First Post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMoments.map((moment) => (
                <PostCard
                  key={moment._id}
                  moment={moment}
                  onUpdate={() => loadMoments(true)}
                  onHidePost={handleHidePost}
                  onWatchReel={(id) => setActiveReelModalId(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE POST MODAL ── */}
      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultMediaType={createDefaultType}
        onSuccess={() => loadMoments(true)}
      />

      {/* ── FULLSCREEN TIKTOK REEL VIEWER MODAL (WHEN WATCHING FROM FEED) ── */}
      {activeReelModalId && (
        <ReelsViewer
          moments={visibleMoments}
          initialMomentId={activeReelModalId}
          isModal={true}
          onClose={() => setActiveReelModalId(null)}
          onUpdate={() => loadMoments(true)}
        />
      )}
    </div>
  );
};
