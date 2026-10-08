import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiSealCheckFill as BadgeCheck,
  PiCaretRightBold as ChevronRight,
  PiPlayFill as Play,
  PiVideoCameraFill as VideoIcon,
  PiHeartFill as Heart,
  PiChatCircleFill as MessageCircle,
  PiShareNetworkFill as Share2,
  PiEyeFill as Eye,
  PiClockFill as Clock,
  PiClockCounterClockwiseFill as HistoryIcon,
  PiBroadcastFill as Broadcast,
  PiSparkleFill as Sparkles,
  PiPlusBold as Plus,
  PiArrowClockwiseBold as Refresh,
  PiCrownFill as Crown,
  PiGiftFill as Gift,
  PiBookOpenFill as BookOpen,
  PiXBold as X,
  PiLightbulbFill as Lightbulb,
  PiTrendUpBold as TrendUp,
  PiUserPlusFill as UserPlus,
  PiImageSquareFill as ImageIcon,
} from 'react-icons/pi';
import { streamerApi, type CreatorStats, type CreatorVideoItem, type CreatorAcademyItem } from '../api/streamer.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, SectionCard, StatCell, HelpButton } from '../components/common';
import { Avatar } from '../components/user';
import { Loading, Modal, Button } from '../components/ui';
import { compactNumber, timeAgo } from '../lib/time';

type TimeRange = '7d' | '30d' | 'all';
type ContentTab = 'videos' | 'photos' | 'top';

export const CreatorCenter = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [contentTab, setContentTab] = useState<ContentTab>('videos');
  const [selectedVideo, setSelectedVideo] = useState<CreatorVideoItem | null>(null);
  const [selectedAcademy, setSelectedAcademy] = useState<CreatorAcademyItem | null>(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await optional(streamerApi.getCreatorStats());
      if (res?.data) {
        setStats(res.data);
      }
    } catch {
      if (isRefresh) showToast('Failed to refresh stats', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    optional(streamerApi.getCreatorStats())
      .then((res) => {
        if (!cancelled && res?.data) {
          setStats(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const posted = stats?.progress?.posted ?? stats?.totals?.videos ?? 0;
  const target = stats?.progress?.target ?? 3;
  const progressPercent = stats?.progress?.percent ?? (target > 0 ? Math.min(100, Math.round((posted / target) * 100)) : 0);
  const currentLevel = stats?.level ?? 1;
  const levelTitle = stats?.levelTitle ?? 'Rookie Creator';

  // Active period metrics based on selected timeframe
  const activePeriod = useMemo(() => {
    if (timeRange === '30d') return stats?.last30Days || stats?.last7Days;
    if (timeRange === 'all') return stats?.allTime || stats?.last7Days;
    return stats?.last7Days;
  }, [timeRange, stats]);

  // Filtered content list
  const filteredContent = useMemo(() => {
    if (!stats?.myVideos) return [];
    if (contentTab === 'photos') {
      return stats.myVideos.filter((item) => item.mediaType === 'image');
    }
    if (contentTab === 'top') {
      return stats.topVideos && stats.topVideos.length > 0 ? stats.topVideos : stats.myVideos;
    }
    return stats.myVideos.filter((item) => item.mediaType === 'video' || !!item.videoUrl);
  }, [contentTab, stats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ECFDF5] via-[#F0FDF4] to-surface-soft pb-12">
      <ScreenHeader
        title="Video Creator Center"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              aria-label="Refresh stats"
              className={`w-9 h-9 rounded-full flex items-center justify-center text-ink-muted hover:text-ink active:scale-95 transition-all ${
                refreshing ? 'animate-spin text-role-success' : ''
              }`}
            >
              <Refresh className="w-5 h-5" />
            </button>
            <HelpButton />
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-24 gap-3">
          <Loading size="lg" />
          <p className="text-sm text-ink-muted animate-pulse font-medium">Connecting creator analytics...</p>
        </div>
      ) : (
        <div className="px-3 space-y-3.5 pt-1">
          {/* Creator Profile & Level Card */}
          <SectionCard className="border border-[#BBF7D0] bg-white shadow-sm overflow-hidden relative">
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="relative">
                <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="lg" className="border-2 border-[#22C55E]/30 ring-2 ring-white" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#22C55E] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                  ★
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-ink text-base truncate">{user?.nickname || 'Creator'}</p>
                  {(stats?.verified ?? user?.verification?.verified) ? (
                    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#E0F2FE] text-[#0284C7] text-[10px] font-bold shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-slate-100 text-ink-muted text-[10px] font-medium shrink-0">
                      Creator
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">ID: {user?.uid || '—'}</p>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white text-xs font-black shadow-sm">
                  <Crown className="w-3.5 h-3.5" /> Lv.{currentLevel}
                </div>
                <p className="text-[11px] font-semibold text-[#15803D] mt-1">{levelTitle}</p>
              </div>
            </div>

            {/* Level XP Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 relative z-10">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="text-ink flex items-center gap-1">
                  <TrendUp className="w-3.5 h-3.5 text-[#22C55E]" /> Level Progress
                </span>
                <span className="text-ink-muted">
                  {posted} / {target} Videos ({progressPercent}%)
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                />
              </div>

              <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
                {posted >= target ? (
                  <span className="text-[#16A34A] font-semibold">🎉 Milestone achieved! Keep posting to elevate your creator tier.</span>
                ) : (
                  <>
                    Post <span className="font-bold text-ink">{target - posted}</span> more high-quality videos or reels to unlock <span className="font-bold text-ink">Lv.{currentLevel + 1}</span> and boost discovery reach!
                  </>
                )}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
              <button
                onClick={() => navigate('/moments/new')}
                className="h-11 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-[#22C55E]/20 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4 font-black" /> Post New Reel
              </button>

              <button
                onClick={() => navigate('/go-live')}
                className="h-11 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-[#3B82F6]/20 active:scale-[0.98] transition-all"
              >
                <Broadcast className="w-4 h-4" /> Go Live
              </button>
            </div>
          </SectionCard>

          {/* Connected Hub Navigation Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/streamer-center')}
              className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Broadcast className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-ink truncate">Streamer Center</p>
                <p className="text-[10px] text-ink-muted truncate">Live Broadcasts & Host</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/watch-history')}
              className="p-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 shadow-2xs active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <HistoryIcon className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-ink truncate">Watch History</p>
                <p className="text-[10px] text-ink-muted truncate">Live & Video History</p>
              </div>
            </button>
          </div>

          {/* Timeframe Filter Switcher */}
          <div className="flex items-center justify-between bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-bold text-ink pl-3">Analytics Range:</span>
            <div className="flex gap-1">
              {(['7d', '30d', 'all'] as TimeRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeRange === r
                      ? 'bg-[#22C55E] text-white shadow-xs'
                      : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                  }`}
                >
                  {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Key Analytics Grid */}
          <SectionCard
            title="Video & Moments Analytics"
            right={
              <span className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Realtime Metrics
              </span>
            }
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex flex-col">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#15803D]">
                  <Clock className="w-3.5 h-3.5" /> Watch Time
                </div>
                <p className="text-lg font-black text-ink mt-1">
                  {timeRange === 'all'
                    ? `${stats?.totals?.videoWatchTimeHours ?? 0}h`
                    : `${activePeriod?.watchTimeHours ?? 0}h`}
                </p>
                <span className="text-[10px] text-ink-muted mt-0.5">
                  {timeRange === 'all'
                    ? `${stats?.totals?.videoWatchTimeMinutes ?? 0} mins`
                    : `${activePeriod?.watchTimeMinutes ?? 0} mins`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex flex-col">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#1D4ED8]">
                  <Eye className="w-3.5 h-3.5" /> Video Views
                </div>
                <p className="text-lg font-black text-ink mt-1">
                  {compactNumber(timeRange === 'all' ? stats?.totals?.views ?? 0 : activePeriod?.views ?? 0)}
                </p>
                <span className="text-[10px] text-ink-muted mt-0.5">
                  Total impressions
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF5FF] border border-[#F3E8FF] flex flex-col">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#7E22CE]">
                  <VideoIcon className="w-3.5 h-3.5" /> Reels Count
                </div>
                <p className="text-lg font-black text-ink mt-1">
                  {stats?.totals?.videos ?? 0}
                </p>
                <span className="text-[10px] text-ink-muted mt-0.5">
                  {stats?.totals?.posts ?? 0} total posts
                </span>
              </div>
            </div>

            {/* Second Row of Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-1 border-t border-slate-100">
              <div className="text-center p-2 rounded-lg bg-slate-50">
                <p className="text-xs text-ink-muted flex items-center justify-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" /> Likes
                </p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {compactNumber(stats?.totals?.likes ?? 0)}
                </p>
              </div>

              <div className="text-center p-2 rounded-lg bg-slate-50">
                <p className="text-xs text-ink-muted flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3 text-sky-500" /> Comments
                </p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {compactNumber(stats?.totals?.comments ?? 0)}
                </p>
              </div>

              <div className="text-center p-2 rounded-lg bg-slate-50">
                <p className="text-xs text-ink-muted flex items-center justify-center gap-1">
                  <Share2 className="w-3 h-3 text-amber-500" /> Shares
                </p>
                <p className="text-sm font-bold text-ink mt-0.5">
                  {compactNumber(stats?.totals?.shares ?? 0)}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Live Streaming Synergy Connection */}
          <SectionCard
            title="Live Stream Synergy"
            right={
              <button
                onClick={() => navigate('/streamer-center')}
                className="text-xs text-role-primary font-semibold flex items-center gap-0.5"
              >
                Streamer Hub <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <p className="text-xs text-ink-muted mb-3 leading-relaxed">
              Video reels drive continuous new viewers directly into your live streams. Here is your live broadcast performance:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <StatCell label="Live Duration" value={`${stats?.totals?.liveDurationHours ?? 0}h`} />
              <StatCell label="Live Streams" value={stats?.totals?.liveStreamsCount ?? 0} />
              <StatCell label="Live Viewers" value={compactNumber(stats?.totals?.liveViewersCount ?? 0)} />
            </div>

            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">Total Diamonds & Gifts Earned</p>
                  <p className="text-sm font-black text-amber-600">
                    💎 {compactNumber(stats?.totals?.liveDiamondsEarned ?? 0)} Diamonds
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/wallet')}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-bold text-ink hover:bg-amber-100 transition-colors shrink-0"
              >
                Wallet
              </button>
            </div>
          </SectionCard>

          {/* My Content / Reels & Moments Manager */}
          <SectionCard
            title="My Moments & Reels"
            right={
              <button
                onClick={() => navigate('/moments/new')}
                className="text-xs text-[#16A34A] font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Upload Reel
              </button>
            }
          >
            {/* Content Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-2 mb-3">
              <button
                onClick={() => setContentTab('videos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  contentTab === 'videos'
                    ? 'bg-[#22C55E] text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" /> Video Reels ({stats?.totals?.videos ?? 0})
              </button>

              <button
                onClick={() => setContentTab('photos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  contentTab === 'photos'
                    ? 'bg-[#22C55E] text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Photos ({stats?.totals?.images ?? 0})
              </button>

              <button
                onClick={() => setContentTab('top')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  contentTab === 'top'
                    ? 'bg-[#22C55E] text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Top Ranked
              </button>
            </div>

            {/* Content Grid */}
            {filteredContent.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#22C55E] flex items-center justify-center text-2xl mb-3 shadow-inner">
                  <VideoIcon className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-ink">No moments or reels found</p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs">
                  {contentTab === 'photos'
                    ? 'Share photos and life updates with your community.'
                    : 'Start creating and posting short video reels to gain followers and unlock creator rewards!'}
                </p>
                <Button
                  onClick={() => navigate('/moments/new')}
                  className="mt-4 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs px-5 py-2.5 rounded-full font-bold shadow-md shadow-[#22C55E]/20"
                >
                  <Plus className="w-4 h-4 mr-1 inline" /> Post First Reel
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {filteredContent.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => setSelectedVideo(item)}
                    className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 cursor-pointer group hover:border-[#22C55E] transition-all flex flex-col"
                  >
                    {/* Media Thumbnail Container */}
                    <div className="relative aspect-[4/5] bg-slate-900 overflow-hidden">
                      {item.thumbnail || (item.media && item.media[0]) ? (
                        <img
                          src={item.thumbnail || item.media[0]}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/50">
                          <VideoIcon className="w-8 h-8" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Video Duration Badge */}
                      {item.mediaType === 'video' && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-0.5">
                          <Play className="w-2.5 h-2.5 fill-current" />
                          {Math.floor((item.durationSec || 25) / 60)}:
                          {String((item.durationSec || 25) % 60).padStart(2, '0')}
                        </span>
                      )}

                      {/* Views overlay */}
                      <span className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1 drop-shadow-sm">
                        <Eye className="w-3.5 h-3.5 text-white/90" />
                        {compactNumber(item.viewCount || 0)}
                      </span>
                    </div>

                    {/* Meta info below image */}
                    <div className="p-2.5 bg-white flex-1 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-ink line-clamp-1 leading-snug">
                        {item.content || (item.mediaType === 'video' ? 'Video Reel' : 'Moment Post')}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-ink-muted mt-2 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1 text-rose-500 font-semibold">
                          <Heart className="w-3 h-3" /> {(item.likes || []).length}
                        </span>
                        <span className="flex items-center gap-1 text-sky-500 font-semibold">
                          <MessageCircle className="w-3 h-3" /> {(item.comments || []).length}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Creator Milestones & Perks */}
          <SectionCard
            title="Creator Tiers & Perks"
            right={
              <span className="text-xs text-ink-muted font-medium">
                Current: <strong className="text-[#16A34A]">Lv.{currentLevel}</strong>
              </span>
            }
          >
            <div className="space-y-2">
              {(stats?.perks || [
                { title: 'Video Gifts & Tipping', desc: 'Receive virtual gifts and coins directly on your video reels', unlocked: currentLevel >= 1, reqLevel: 1 },
                { title: 'HD 1080p Video Uploads', desc: 'Higher bitrate and crystal-clear video streaming playback', unlocked: currentLevel >= 2, reqLevel: 2 },
                { title: 'Feed Recommendation Boost', desc: 'Featured priority in Popular feed and search discovery', unlocked: currentLevel >= 3, reqLevel: 3 },
                { title: 'Verified Creator Badge', desc: 'Official blue verification checkmark displayed on your profile', unlocked: currentLevel >= 4 || !!user?.verification?.verified, reqLevel: 4 },
                { title: 'Creator Monthly Bonus Fund', desc: 'Monthly cash and diamond bonus payouts for high view counts', unlocked: currentLevel >= 5, reqLevel: 5 },
                { title: 'VIP Studio Concierge Support', desc: 'Dedicated creator manager and custom virtual gifts support', unlocked: currentLevel >= 6, reqLevel: 6 },
              ]).map((perk, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                    perk.unlocked
                      ? 'bg-white border-[#BBF7D0] shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80 opacity-75'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                      perk.unlocked
                        ? 'bg-[#22C55E] text-white shadow-xs'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {perk.unlocked ? '✓' : `Lv.${perk.reqLevel}`}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-ink">{perk.title}</p>
                      {perk.unlocked && (
                        <span className="text-[10px] font-bold text-[#16A34A] px-1.5 py-0.2 rounded bg-emerald-50">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">{perk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Creator Academy & Tips */}
          {stats?.academy && stats.academy.length > 0 && (
            <SectionCard
              title="Creator Academy & Pro Tips"
              right={
                <span className="text-xs text-[#16A34A] font-bold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Best Practices
                </span>
              }
            >
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {stats.academy.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAcademy(item)}
                    className="relative w-[220px] rounded-xl overflow-hidden shrink-0 bg-surface-sunken border border-slate-200 cursor-pointer group hover:border-[#22C55E] transition-all"
                  >
                    <div className="relative h-[120px] w-full">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-emerald-800 flex items-center justify-center text-white">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold">
                        {item.category || 'Guide'}
                      </span>
                      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-ink shadow-sm">
                        <Play className="w-3.5 h-3.5 ml-0.5 text-[#16A34A]" />
                      </span>
                    </div>

                    <div className="p-2.5 bg-white">
                      <p className="text-xs font-bold text-ink leading-snug line-clamp-2">{item.title}</p>
                      <p className="text-[10px] text-ink-muted mt-1 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.duration || '3 min read'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Video Detail & Playback Modal */}
      {selectedVideo && (
        <Modal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} title="Reel Details">
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[380px] mx-auto flex items-center justify-center">
              {selectedVideo.videoUrl || (selectedVideo.media && selectedVideo.media[0] && /\.(mp4|webm|mov|mkv)$/i.test(selectedVideo.media[0])) ? (
                <video
                  src={selectedVideo.videoUrl || selectedVideo.media[0]}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : selectedVideo.thumbnail || (selectedVideo.media && selectedVideo.media[0]) ? (
                <img
                  src={selectedVideo.thumbnail || selectedVideo.media[0]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-white text-sm">Media not available</div>
              )}
            </div>

            {selectedVideo.content && (
              <p className="text-sm text-ink font-medium leading-relaxed px-1">
                {selectedVideo.content}
              </p>
            )}

            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl text-center">
              <div>
                <p className="text-[10px] text-ink-muted">Views</p>
                <p className="text-xs font-bold text-ink mt-0.5">{compactNumber(selectedVideo.viewCount || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">Likes</p>
                <p className="text-xs font-bold text-rose-500 mt-0.5">{(selectedVideo.likes || []).length}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">Comments</p>
                <p className="text-xs font-bold text-sky-500 mt-0.5">{(selectedVideo.comments || []).length}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted">Shares</p>
                <p className="text-xs font-bold text-amber-500 mt-0.5">{selectedVideo.shareCount || 0}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSelectedVideo(null);
                  navigate(`/moments`);
                }}
                className="flex-1 bg-[#22C55E] text-white font-bold"
              >
                View in Feed
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

      {/* Academy Guide Reader Modal */}
      {selectedAcademy && (
        <Modal
          isOpen={!!selectedAcademy}
          onClose={() => setSelectedAcademy(null)}
          title={selectedAcademy.title}
        >
          <div className="space-y-4">
            {selectedAcademy.thumbnail && (
              <div className="rounded-xl overflow-hidden aspect-video w-full bg-slate-100">
                <img src={selectedAcademy.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-3 text-sm text-ink leading-relaxed">
              <p className="font-semibold text-[#15803D] flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" /> Creator Pro Tip
              </p>
              <p>
                To maximize your reach on Nevo Live, focus on creating 15-30 second reels with a high-energy hook in the first 3 seconds. Engaging reels get recommended on the popular feed and bring constant stream of viewers directly to your live broadcasts.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-ink-muted bg-slate-50 p-3 rounded-xl border border-slate-200">
                <li>Use good front-facing lighting with bright colors</li>
                <li>Tag your video with relevant hashtags (#nevolive #trending)</li>
                <li>Add an inviting caption encouraging fans to join your live room</li>
                <li>Engage with commenters immediately to boost algorithm ranking</li>
              </ul>
            </div>

            <Button
              onClick={() => {
                setSelectedAcademy(null);
                navigate('/moments/new');
              }}
              className="w-full bg-[#22C55E] text-white font-bold"
            >
              Apply Tips & Post Reel
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
