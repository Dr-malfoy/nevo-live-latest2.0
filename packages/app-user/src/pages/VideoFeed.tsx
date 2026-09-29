import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCameraFill as Camera, PiGiftFill as Gift, PiHeartFill as Heart, PiChatCircleFill as MessageCircle, PiMagnifyingGlassBold as Search, PiShareNetworkFill as Share2, PiVideoCameraFill as VideoIcon } from 'react-icons/pi';
import { videoApi, type VideoItem } from '../api/social.api';
import { momentsApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { TabBar, EmptyState } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Short video feed — requirement #57.
 *
 * `/api/videos/feed` is specified in BACKEND-GUIDE.md §4.8. Until it exists
 * this falls back to `/api/moments`, which is live — so the feed works today
 * with photo moments and gains video the moment the endpoint ships.
 *
 * Overlay text stays white: this is full-bleed media, not app chrome.
 */

type Tab = 'following' | 'popular' | 'hot';

export const VideoFeed = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('popular');
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setIndex(0);

    const load = async () => {
      const res = await optional(videoApi.getFeed(tab)).catch(() => null);
      if (cancelled) return;

      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data);
        return;
      }

      // Fallback to the live moments feed.
      try {
        const { data } = await momentsApi.getFeed(1);
        if (cancelled) return;
        setItems(
          (data.data || []).map((m: any) => ({
            _id: m._id,
            userId: m.userId,
            content: m.content,
            thumbnail: m.media?.[0],
            videoUrl: undefined,
            hashtags: [],
            likes: m.likes || [],
            comments: m.comments || [],
            createdAt: m.createdAt,
          }))
        );
      } catch {
        if (!cancelled) setItems([]);
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  // Track which card fills the viewport so the action rail matches it.
  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setIndex(Math.round(el.scrollTop / el.clientHeight));
  };

  const active = items[index];

  const like = async () => {
    if (!active) return;
    try {
      await momentsApi.toggleLike(active._id);
      setItems((rows) =>
        rows.map((row) =>
          row._id === active._id
            ? {
                ...row,
                likes: row.likes.includes(user?._id || '')
                  ? row.likes.filter((id) => id !== user?._id)
                  : [...row.likes, user?._id || ''],
              }
            : row
        )
      );
    } catch {
      showToast('Could not like this post', 'error');
    }
  };

  const share = async () => {
    if (!active) return;
    const url = `${window.location.origin}/moments`;
    try {
      if (navigator.share) await navigator.share({ url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied', 'success');
      }
      optional(videoApi.share(active._id)).catch(() => {});
    } catch {
      /* dismissed */
    }
  };

  const liked = !!active && !!user && active.likes.includes(user._id);

  return (
    <div className="fixed inset-0 bg-black text-white max-w-md mx-auto">
      {/* Top tabs over the media */}
      <div className="absolute top-0 inset-x-0 z-20 safe-top">
        <div className="flex items-center gap-3 px-4 h-14">
          <TabBar
            tabs={[
              { key: 'following', label: 'Following' },
              { key: 'popular', label: 'Popular' },
              { key: 'hot', label: 'Hot' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
            tone="light"
            className="flex-1"
          />
          <button
            onClick={() => navigate('/search')}
            aria-label="Search"
            className="w-9 h-9 flex items-center justify-center text-white"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/moments/new')}
            aria-label="Record"
            className="w-9 h-9 flex items-center justify-center text-white"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <Loading className="pt-40" size="lg" />
      ) : items.length === 0 ? (
        <div className="h-full flex items-center justify-center">
          <EmptyState
            icon={<VideoIcon className="w-6 h-6" />}
            title="Nothing to watch yet"
            hint="Posts from people you follow will appear here."
            className="[&_p:first-of-type]:text-white [&_p:last-of-type]:text-white/60 [&>div]:!bg-white/10"
          />
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            onScroll={onScroll}
            className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
          >
            {items.map((item) => (
              <section key={item._id} className="relative h-full w-full snap-start snap-always">
                {item.videoUrl ? (
                  <video
                    src={item.videoUrl}
                    poster={item.thumbnail}
                    loop
                    muted
                    playsInline
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2A1655] to-[#0E0A18]" />
                )}

                <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Bottom-left author block */}
                <div className="absolute left-4 right-20 bottom-24">
                  {item.fromFollowing && (
                    <span className="inline-flex h-7 px-3 rounded-full bg-black/50 text-white text-[12px] items-center mb-2">
                      From following
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/user/${item.userId?._id}`)}
                    className="flex items-center gap-2"
                  >
                    <Avatar src={item.userId?.avatar} nickname={item.userId?.nickname || '?'} size="sm" ringed />
                    <span className="text-white font-bold text-sm truncate max-w-[180px]">
                      {item.userId?.nickname}
                    </span>
                  </button>
                  {item.content && (
                    <p className="text-white/90 text-[13px] mt-2 line-clamp-2">{item.content}</p>
                  )}
                  {item.hashtags && item.hashtags.length > 0 && (
                    <p className="text-[#9BB4FF] text-[13px] mt-1">
                      {item.hashtags.map((h) => `#${h}`).join(' ')}
                    </p>
                  )}
                </div>
              </section>
            ))}
          </div>

          {/* Right action rail (#57.3) */}
          {active && (
            <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
              <button onClick={like} className="flex flex-col items-center gap-1" aria-label="Like">
                <Heart
                  className={`w-8 h-8 ${liked ? 'text-status-live fill-status-live' : 'text-white'}`}
                />
                <span className="text-white text-[11px] font-semibold tabular-nums">
                  {compactNumber(active.likes.length)}
                </span>
              </button>

              <button
                onClick={() => navigate('/moments')}
                className="flex flex-col items-center gap-1"
                aria-label="Comments"
              >
                <MessageCircle className="w-8 h-8 text-white" />
                <span className="text-white text-[11px] font-semibold tabular-nums">
                  {compactNumber(active.comments.length)}
                </span>
              </button>

              <button
                onClick={() => showToast('Gifting a video is not connected yet', 'info')}
                className="flex flex-col items-center gap-1"
                aria-label="Send a gift"
              >
                <Gift className="w-8 h-8 text-[#FF6EC7]" />
                <span className="text-white text-[11px] font-semibold tabular-nums">
                  {compactNumber(active.giftCount ?? 0)}
                </span>
              </button>

              <button onClick={share} className="flex flex-col items-center gap-1" aria-label="Share">
                <Share2 className="w-8 h-8 text-white" />
                <span className="text-white text-[11px] font-semibold tabular-nums">
                  {compactNumber(active.shareCount ?? 0)}
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
