import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiClockCounterClockwiseFill as History,
  PiRadioFill as Radio,
  PiTrashFill as Trash2,
  PiPlayFill as Play,
  PiVideoCameraFill as VideoIcon,
  PiBroadcastFill as Broadcast,
  PiEyeFill as Eye,
  PiClockFill as Clock,
  PiHeartFill as Heart,
  PiArrowClockwiseBold as Refresh,
  PiXBold as X,
  PiUserBold as UserIcon,
} from 'react-icons/pi';
import { historyApi, type WatchGroup, type WatchItem } from '../api/social.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import { ScreenHeader, TabBar, EmptyState, HelpButton } from '../components/common';
import { Loading, Modal, Button } from '../components/ui';
import { flagEmoji } from '../lib/countries';
import { compactNumber, timeAgo } from '../lib/time';

export const WatchHistory = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [type, setType] = useState<'live' | 'video'>('live');
  const [groups, setGroups] = useState<WatchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<WatchItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const fetchHistory = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await optional(historyApi.get(type));
      if (res?.success && Array.isArray(res.data?.groups)) {
        setGroups(res.data.groups);
      } else {
        setGroups([]);
      }
    } catch {
      if (isRefresh) showToast('Failed to refresh watch history', 'error');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    optional(historyApi.get(type))
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data?.groups)) {
          setGroups(res.data.groups);
        } else {
          setGroups([]);
        }
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [type]);

  const clearAll = async () => {
    setShowClearConfirm(false);
    try {
      const res = await optional(historyApi.clear());
      if (res !== null) {
        setGroups([]);
        showToast('Watch history cleared', 'success');
      } else {
        showToast('Could not clear history', 'error');
      }
    } catch {
      showToast('Failed to clear history', 'error');
    }
  };

  const handleItemClick = (item: WatchItem) => {
    if (type === 'live') {
      if (item.ended) {
        // Stream ended -> open host profile
        if (item.hostId) {
          navigate(`/user/${item.hostId}`);
        } else {
          navigate(`/live/${item.targetId}`);
        }
      } else {
        navigate(`/live/${item.targetId}`);
      }
    } else {
      // Video / reel -> open preview modal
      setSelectedVideo(item);
    }
  };

  const totalItemsCount = groups.reduce((acc, g) => acc + (g.items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <ScreenHeader
        title="Watch History"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchHistory(true)}
              disabled={refreshing}
              aria-label="Refresh history"
              className={`w-8 h-8 rounded-full flex items-center justify-center text-ink-muted hover:text-ink transition-all ${
                refreshing ? 'animate-spin text-role-primary' : ''
              }`}
            >
              <Refresh className="w-4.5 h-4.5" />
            </button>

            {totalItemsCount > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                aria-label="Clear history"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
            <HelpButton />
          </div>
        }
      >
        <div className="px-4">
          <TabBar
            tabs={[
              { key: 'live', label: 'Live Streams' },
              { key: 'video', label: 'Videos & Reels' },
            ]}
            active={type}
            onChange={(k) => setType(k as 'live' | 'video')}
          />
        </div>
      </ScreenHeader>

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <Loading size="lg" />
          <p className="text-sm text-ink-muted animate-pulse font-medium">Loading watch history...</p>
        </div>
      ) : (
        <div className="px-3 pt-3 space-y-4">
          {/* Creator & Streamer Quick Hub Bar */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
            <button
              onClick={() => navigate('/streamer-center')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                type === 'live'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-ink hover:bg-slate-100'
              }`}
            >
              <Broadcast className="w-4 h-4" /> Streamer Center
            </button>

            <button
              onClick={() => navigate('/creator-center')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                type === 'video'
                  ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-xs'
                  : 'bg-slate-50 text-ink hover:bg-slate-100'
              }`}
            >
              <VideoIcon className="w-4 h-4" /> Creator Center
            </button>
          </div>

          {/* Context Banner */}
          <div
            onClick={() => navigate(type === 'live' ? '/streamer-center' : '/creator-center')}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
              type === 'live'
                ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-blue-200'
                : 'bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${
                  type === 'live' ? 'bg-blue-600' : 'bg-[#22C55E]'
                }`}
              >
                {type === 'live' ? <Broadcast className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink truncate">
                  {type === 'live' ? 'Manage Your Live Streams' : 'Manage Video Reels & Watch Time'}
                </p>
                <p className="text-[11px] text-ink-muted truncate">
                  {type === 'live'
                    ? 'Check AI stream reports, peak viewers & live targets'
                    : 'Check your video views, creator tier & upload new reels'}
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-bold shrink-0 ml-2 ${
                type === 'live' ? 'text-blue-600' : 'text-[#16A34A]'
              }`}
            >
              Open →
            </span>
          </div>

          {totalItemsCount === 0 ? (
            <div className="px-4 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-ink-muted mb-4 shadow-inner">
                {type === 'live' ? <Broadcast className="w-8 h-8 text-indigo-500" /> : <VideoIcon className="w-8 h-8 text-rose-500" />}
              </div>
              <h3 className="text-base font-bold text-ink">No {type === 'live' ? 'live streams' : 'videos'} in history</h3>
              <p className="text-xs text-ink-muted mt-1 max-w-xs leading-relaxed">
                {type === 'live'
                  ? 'Live broadcasts and party rooms you watch will automatically be recorded here.'
                  : 'Short videos and reels you view in moments will show up here, grouped by date.'}
              </p>

              <Button
                onClick={() => navigate(type === 'live' ? '/' : '/moments')}
                className="mt-5 bg-gradient-to-r from-role-primary to-indigo-600 text-white text-xs px-6 py-2.5 rounded-full font-bold shadow-md"
              >
                {type === 'live' ? 'Explore Live Streams' : 'Watch Video Reels'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.label}>
              <div className="flex items-center gap-2 px-1 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-ink-muted" />
                <h2 className="text-xs font-bold text-ink uppercase tracking-wider">{group.label}</h2>
                <span className="text-[10px] font-semibold text-ink-muted bg-slate-200/80 px-1.5 py-0.2 rounded-full">
                  {group.items.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {group.items.map((item, idx) => (
                  <button
                    key={`${item.targetId}-${idx}`}
                    onClick={() => handleItemClick(item)}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 text-left group shadow-2xs hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    {/* Media Cover / Thumbnail */}
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-800">
                        {type === 'live' ? <Radio className="w-8 h-8" /> : <VideoIcon className="w-8 h-8" />}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                    {/* Top status badges */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                      {type === 'live' ? (
                        <span
                          className={`h-5 px-2 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm backdrop-blur-xs ${
                            item.ended
                              ? 'bg-black/60 text-white/90'
                              : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white animate-pulse'
                          }`}
                        >
                          {!item.ended && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping mr-0.5" />}
                          {item.ended ? 'Ended' : 'LIVE'}
                        </span>
                      ) : (
                        <span className="h-5 px-2 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {item.durationSec
                            ? `${Math.floor(item.durationSec / 60)}:${String(item.durationSec % 60).padStart(2, '0')}`
                            : 'Reel'}
                        </span>
                      )}

                      {item.country && (
                        <span className="text-sm drop-shadow-sm">{flagEmoji(item.country)}</span>
                      )}
                    </div>

                    {/* Center play icon on hover for videos */}
                    {type === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="w-10 h-10 rounded-full bg-white/90 text-ink flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 ml-0.5 text-role-primary" />
                        </span>
                      </div>
                    )}

                    {/* Bottom Metadata */}
                    <div className="absolute inset-x-2.5 bottom-2.5">
                      <p className="text-xs font-bold text-white truncate drop-shadow-sm">
                        {item.title || item.hostName || (type === 'live' ? 'Live Broadcast' : 'Video Reel')}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-white/80 mt-1">
                        <span className="truncate font-medium flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-white/70" />
                          {item.hostName || 'Creator'}
                        </span>

                        {item.viewerCount != null && (
                          <span className="text-[10px] font-bold text-white flex items-center gap-0.5 shrink-0 ml-1">
                            <Eye className="w-3 h-3" />
                            {compactNumber(item.viewerCount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
            </div>
          )}
        </div>
      )}

      {/* Video Reel Playback Modal */}
      {selectedVideo && (
        <Modal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} title={selectedVideo.title || 'Video Reel'}>
          <div className="space-y-3.5">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] mx-auto flex items-center justify-center shadow-inner">
              {selectedVideo.videoUrl ? (
                <video
                  src={selectedVideo.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : selectedVideo.cover ? (
                <img
                  src={selectedVideo.cover}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white text-sm">Media preview not available</div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-role-primary/10 text-role-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedVideo.hostName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{selectedVideo.hostName || 'Creator'}</p>
                  <p className="text-[10px] text-ink-muted">Watched {selectedVideo.watchedAt ? timeAgo(selectedVideo.watchedAt) : 'recently'}</p>
                </div>
              </div>

              {selectedVideo.hostId && (
                <button
                  onClick={() => {
                    const hId = selectedVideo.hostId;
                    setSelectedVideo(null);
                    navigate(`/user/${hId}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-ink hover:bg-slate-100 transition-colors"
                >
                  View Profile
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => {
                  setSelectedVideo(null);
                  navigate('/moments');
                }}
                className="flex-1 bg-gradient-to-r from-role-primary to-indigo-600 text-white font-bold"
              >
                Watch in Feed
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedVideo(null)}
                className="px-4"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <Modal
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title="Clear Watch History"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-ink leading-relaxed">
              Are you sure you want to clear your entire watch history? This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={clearAll}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold"
              >
                Yes, Clear All
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
