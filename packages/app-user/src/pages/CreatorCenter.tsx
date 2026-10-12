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
  PiChartLineUpBold as ChartLineUp,
  PiMedalFill as Medal,
  PiTrophyFill as Trophy,
  PiCheckBold as Check,
  PiCoinsFill as Coins,
} from 'react-icons/pi';
import { streamerApi, type CreatorStats, type CreatorVideoItem, type CreatorAcademyItem, type CreatorDailyInsight } from '../api/streamer.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, SectionCard, StatCell, HelpButton } from '../components/common';
import { Avatar } from '../components/user';
import { Loading, Modal, Button } from '../components/ui';
import { compactNumber, timeAgo } from '../lib/time';

type TimeRange = '7d' | '30d' | 'all';
type ContentTab = 'videos' | 'photos' | 'top';
type GraphMetric = 'views' | 'engagement' | 'watchTime';

export const CreatorCenter = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const showToast = useUIStore((s) => s.showToast);

  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [contentTab, setContentTab] = useState<ContentTab>('videos');
  const [selectedVideo, setSelectedVideo] = useState<CreatorVideoItem | null>(null);
  const [selectedAcademy, setSelectedAcademy] = useState<CreatorAcademyItem | null>(null);

  // Insights Graph State
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('views');
  const [selectedGraphIndex, setSelectedGraphIndex] = useState<number | null>(null);

  // Claiming Reward State
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

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

  // Only videos for rewards list
  const rewardVideos = useMemo(() => {
    if (!stats?.myVideos) return [];
    return stats.myVideos
      .filter((v) => v.mediaType === 'video' || !!v.videoUrl)
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
  }, [stats?.myVideos]);

  // Handle Claim Video Milestone Reward (1k -> 200 💎, 5k -> 1,000 💎)
  const handleClaimReward = async (videoId: string, tier: '1k' | '5k', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `${videoId}-${tier}`;
    setClaimingKey(key);
    try {
      const res = await streamerApi.claimVideoReward(videoId, tier);
      const resData = (res.data as any)?.data || res.data;
      if (resData?.success) {
        const rewardDiamonds = resData.rewardDiamonds || (tier === '1k' ? 200 : 1000);
        showToast(`🎉 Claimed 💎 ${rewardDiamonds.toLocaleString()} Diamonds reward!`, 'success');

        if (resData.currentDiamonds != null) {
          updateUser({ diamonds: resData.currentDiamonds });
        }

        // Update stats locally
        setStats((prev) => {
          if (!prev) return prev;
          const updateItem = (item: CreatorVideoItem) => {
            if (item._id !== videoId) return item;
            const updatedClaimed = [...(item.claimedViewRewards || []), tier];
            return {
              ...item,
              claimedViewRewards: updatedClaimed,
              rewards: {
                tier1k: {
                  required: 1000,
                  diamonds: 200,
                  eligible: (item.viewCount || 0) >= 1000,
                  claimed: updatedClaimed.includes('1k'),
                  progress: Math.min(100, Math.round(((item.viewCount || 0) / 1000) * 100)),
                },
                tier5k: {
                  required: 5000,
                  diamonds: 1000,
                  eligible: (item.viewCount || 0) >= 5000,
                  claimed: updatedClaimed.includes('5k'),
                  progress: Math.min(100, Math.round(((item.viewCount || 0) / 5000) * 100)),
                },
              },
            };
          };

          return {
            ...prev,
            myVideos: prev.myVideos ? prev.myVideos.map(updateItem) : [],
            topVideos: prev.topVideos ? prev.topVideos.map(updateItem) : [],
            rewardsSummary: prev.rewardsSummary ? {
              ...prev.rewardsSummary,
              totalClaimedDiamonds: prev.rewardsSummary.totalClaimedDiamonds + rewardDiamonds,
              totalPendingDiamonds: Math.max(0, prev.rewardsSummary.totalPendingDiamonds - rewardDiamonds),
              totalEligibleClaimable: Math.max(0, prev.rewardsSummary.totalEligibleClaimable - 1),
            } : prev.rewardsSummary,
          };
        });

        // Also update selectedVideo if open in modal
        if (selectedVideo && selectedVideo._id === videoId) {
          const updatedClaimed = [...(selectedVideo.claimedViewRewards || []), tier];
          setSelectedVideo({
            ...selectedVideo,
            claimedViewRewards: updatedClaimed,
            rewards: {
              tier1k: {
                required: 1000,
                diamonds: 200,
                eligible: (selectedVideo.viewCount || 0) >= 1000,
                claimed: updatedClaimed.includes('1k'),
                progress: Math.min(100, Math.round(((selectedVideo.viewCount || 0) / 1000) * 100)),
              },
              tier5k: {
                required: 5000,
                diamonds: 1000,
                eligible: (selectedVideo.viewCount || 0) >= 5000,
                claimed: updatedClaimed.includes('5k'),
                progress: Math.min(100, Math.round(((selectedVideo.viewCount || 0) / 5000) * 100)),
              },
            },
          });
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to claim reward', 'error');
    } finally {
      setClaimingKey(null);
    }
  };

  // Process daily insights graph data
  const graphData = useMemo(() => {
    const list = stats?.dailyInsights || [];
    if (list.length === 0) return [];
    return list;
  }, [stats?.dailyInsights]);

  // Compute SVG line & area path
  const chartGeometry = useMemo(() => {
    if (graphData.length === 0) return null;

    const values = graphData.map((d) => {
      if (graphMetric === 'views') return d.views;
      if (graphMetric === 'engagement') return d.likes + d.comments;
      return d.watchTimeMinutes;
    });

    const maxVal = Math.max(...values, 10);
    const minVal = 0;
    const width = 360;
    const height = 120;
    const paddingX = 20;
    const paddingY = 20;

    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;
    const stepX = graphData.length > 1 ? usableW / (graphData.length - 1) : 0;

    const points = values.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const normalized = (val - minVal) / (maxVal - minVal);
      const y = height - paddingY - normalized * usableH;
      return { x, y, val, original: graphData[idx] };
    });

    if (points.length === 0) return null;

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const cp1x = pPrev.x + (pCurr.x - pPrev.x) / 2;
      const cp1y = pPrev.y;
      const cp2x = pPrev.x + (pCurr.x - pPrev.x) / 2;
      const cp2y = pCurr.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pCurr.x} ${pCurr.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    const peakPoint = [...points].sort((a, b) => b.val - a.val)[0];

    return {
      points,
      pathD,
      areaD,
      maxVal,
      peakPoint,
      width,
      height,
    };
  }, [graphData, graphMetric]);

  const activeHoveredPoint = useMemo(() => {
    if (!chartGeometry) return null;
    if (selectedGraphIndex != null && chartGeometry.points[selectedGraphIndex]) {
      return chartGeometry.points[selectedGraphIndex];
    }
    return chartGeometry.peakPoint;
  }, [chartGeometry, selectedGraphIndex]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ECFDF5] via-[#F0FDF4] to-surface-soft pb-14">
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

          {/* ── 4. CREATOR INSIGHTS GRAPH & ANALYTICS ───────────────────── */}
          <SectionCard
            title="Creator Insights Graph"
            right={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setGraphMetric('views')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    graphMetric === 'views'
                      ? 'bg-[#10B981] text-white shadow-2xs'
                      : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                  }`}
                >
                  Views
                </button>
                <button
                  onClick={() => setGraphMetric('engagement')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    graphMetric === 'engagement'
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                  }`}
                >
                  Reactions
                </button>
                <button
                  onClick={() => setGraphMetric('watchTime')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    graphMetric === 'watchTime'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-ink-muted hover:text-ink hover:bg-slate-100'
                  }`}
                >
                  Watch Time
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Highlight summary badge */}
              {activeHoveredPoint && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs ${
                        graphMetric === 'views'
                          ? 'bg-[#10B981]'
                          : graphMetric === 'engagement'
                          ? 'bg-rose-500'
                          : 'bg-indigo-600'
                      }`}
                    >
                      <ChartLineUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-muted font-medium">
                        {activeHoveredPoint.original?.label || 'Day Performance'}
                      </p>
                      <p className="text-xs font-black text-ink">
                        {graphMetric === 'views' && `${compactNumber(activeHoveredPoint.val)} Views`}
                        {graphMetric === 'engagement' && `${compactNumber(activeHoveredPoint.val)} Reactions & Comments`}
                        {graphMetric === 'watchTime' && `${compactNumber(activeHoveredPoint.val)} Mins Watch Time`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    📈 Active Trend
                  </span>
                </div>
              )}

              {/* Interactive SVG Chart */}
              {chartGeometry ? (
                <div className="relative pt-2 pb-1 bg-gradient-to-b from-slate-50/50 to-white rounded-xl border border-slate-100 overflow-hidden">
                  <svg
                    viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                    className="w-full h-36 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="watchGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gradient Area Fill */}
                    <path
                      d={chartGeometry.areaD}
                      fill={
                        graphMetric === 'views'
                          ? 'url(#viewsGradient)'
                          : graphMetric === 'engagement'
                          ? 'url(#engagementGradient)'
                          : 'url(#watchGradient)'
                      }
                    />

                    {/* Curve Line */}
                    <path
                      d={chartGeometry.pathD}
                      fill="none"
                      stroke={
                        graphMetric === 'views'
                          ? '#10B981'
                          : graphMetric === 'engagement'
                          ? '#F43F5E'
                          : '#6366F1'
                      }
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Interactive Circles / Data Points */}
                    {chartGeometry.points.map((p, idx) => {
                      const isHovered = selectedGraphIndex === idx || (!selectedGraphIndex && p === chartGeometry.peakPoint);
                      return (
                        <g key={idx} className="cursor-pointer" onClick={() => setSelectedGraphIndex(idx)}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={isHovered ? 5.5 : 3}
                            className="transition-all"
                            fill="#FFFFFF"
                            stroke={
                              graphMetric === 'views'
                                ? '#10B981'
                                : graphMetric === 'engagement'
                                ? '#F43F5E'
                                : '#6366F1'
                            }
                            strokeWidth={isHovered ? 2.5 : 1.5}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Date labels below graph */}
                  <div className="flex justify-between px-2 text-[9px] text-ink-muted font-medium pt-1">
                    <span>{graphData[0]?.label || 'Start'}</span>
                    <span>{graphData[Math.floor(graphData.length / 2)]?.label || 'Mid'}</span>
                    <span>{graphData[graphData.length - 1]?.label || 'Today'}</span>
                  </div>
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-ink-muted">
                  No insights recorded yet. Upload reels to start generating trend curves.
                </div>
              )}

              {/* Insights Pill Stats */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <p className="text-[10px] text-[#15803D] font-bold">Peak Video Views</p>
                  <p className="text-sm font-black text-ink mt-0.5">
                    {compactNumber(chartGeometry?.peakPoint?.val || stats?.totals?.views || 0)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                  <p className="text-[10px] text-rose-600 font-bold">Engagement Rate</p>
                  <p className="text-sm font-black text-ink mt-0.5">
                    {stats?.totals?.views && stats.totals.views > 0
                      ? `${Math.min(100, Math.round(((stats.totals.likes + stats.totals.comments) / stats.totals.views) * 100))}%`
                      : '4.8%'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 font-bold">Total Videos</p>
                  <p className="text-sm font-black text-ink mt-0.5">
                    {stats?.totals?.videos ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── 5. VIDEO VIEW REWARDS & MONETIZATION ─────────────────────── */}
          <SectionCard
            title="Video View Rewards"
            right={
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                💎 Diamond Milestones
              </span>
            }
          >
            <div className="space-y-3">
              {/* Program Overview Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-wide uppercase flex items-center gap-1">
                      <Gift className="w-4 h-4" /> Creator Monetization
                    </span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                      Instant Payout
                    </span>
                  </div>

                  <p className="text-base font-black mt-1">Earn Diamonds Per Video View</p>
                  <p className="text-xs text-white/90 mt-0.5 leading-relaxed">
                    Reach view milestones on each video reel to claim diamond rewards directly into your wallet:
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs border border-white/25">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black flex items-center gap-1">
                          <Medal className="w-3.5 h-3.5 text-amber-200" /> 1,000 Views
                        </span>
                        <span className="text-xs font-black text-yellow-200">💎 200</span>
                      </div>
                      <p className="text-[10px] text-white/80 mt-0.5">200 Diamonds per video</p>
                    </div>

                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs border border-white/25">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-yellow-300" /> 5,000 Views
                        </span>
                        <span className="text-xs font-black text-yellow-200">💎 1,000</span>
                      </div>
                      <p className="text-[10px] text-white/80 mt-0.5">1,000 Diamonds per video</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Earned & Pending Rewards Counter */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-amber-800">Total Claimed</p>
                    <p className="text-sm font-black text-amber-600 mt-0.5">
                      💎 {compactNumber(stats?.rewardsSummary?.totalClaimedDiamonds ?? 0)}
                    </p>
                  </div>
                  <Coins className="w-6 h-6 text-amber-500 opacity-80" />
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800">Ready to Claim</p>
                    <p className="text-sm font-black text-[#16A34A] mt-0.5">
                      💎 {compactNumber(stats?.rewardsSummary?.totalPendingDiamonds ?? 0)}
                    </p>
                  </div>
                  <Gift className="w-6 h-6 text-[#22C55E] opacity-80" />
                </div>
              </div>

              {/* Videos Rewards List with Progress and Claim Buttons */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-ink flex items-center gap-1 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" /> Video Milestone Progress
                </p>

                {rewardVideos.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-ink-muted">
                    No video reels uploaded yet. Post your first reel to start tracking view rewards!
                  </div>
                ) : (
                  rewardVideos.slice(0, 5).map((v) => {
                    const views = v.viewCount || 0;
                    const claimed1k = v.claimedViewRewards?.includes('1k');
                    const eligible1k = views >= 1000;
                    const claimed5k = v.claimedViewRewards?.includes('5k');
                    const eligible5k = views >= 5000;

                    const isClaiming1k = claimingKey === `${v._id}-1k`;
                    const isClaiming5k = claimingKey === `${v._id}-5k`;

                    return (
                      <div
                        key={v._id}
                        onClick={() => setSelectedVideo(v)}
                        className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-[#22C55E] transition-all cursor-pointer shadow-2xs space-y-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Video Thumbnail */}
                          <div className="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden relative shrink-0">
                            {v.thumbnail || (v.media && v.media[0]) ? (
                              <img src={v.thumbnail || v.media[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/50">
                                <VideoIcon className="w-6 h-6" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-white text-[9px] font-bold">
                              ▶
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-ink truncate">
                              {v.content || 'Video Reel'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                              <span className="flex items-center gap-0.5 text-blue-600 font-bold">
                                <Eye className="w-3.5 h-3.5" /> {compactNumber(views)} views
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-rose-500 font-semibold">
                                <Heart className="w-3 h-3" /> {(v.likes || []).length}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-sky-500 font-semibold">
                                <MessageCircle className="w-3 h-3" /> {(v.comments || []).length}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Milestone Reward Badges / Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          {/* 1K Tier */}
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
                            <div>
                              <span className="font-bold text-ink flex items-center gap-0.5 text-[10px]">
                                1K Views
                              </span>
                              <span className="text-[10px] text-amber-600 font-black">💎 200</span>
                            </div>

                            {claimed1k ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-0.5">
                                <Check className="w-3 h-3 text-emerald-600 font-black" /> Claimed
                              </span>
                            ) : eligible1k ? (
                              <button
                                onClick={(e) => handleClaimReward(v._id, '1k', e)}
                                disabled={isClaiming1k}
                                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-black text-[10px] shadow-xs active:scale-95 transition-all"
                              >
                                {isClaiming1k ? 'Claiming...' : 'Claim 200 💎'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-ink-muted font-semibold">
                                {compactNumber(views)} / 1K
                              </span>
                            )}
                          </div>

                          {/* 5K Tier */}
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-[11px]">
                            <div>
                              <span className="font-bold text-ink flex items-center gap-0.5 text-[10px]">
                                5K Views
                              </span>
                              <span className="text-[10px] text-amber-600 font-black">💎 1,000</span>
                            </div>

                            {claimed5k ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 font-bold text-[10px] flex items-center gap-0.5">
                                <Check className="w-3 h-3 text-emerald-600 font-black" /> Claimed
                              </span>
                            ) : eligible5k ? (
                              <button
                                onClick={(e) => handleClaimReward(v._id, '5k', e)}
                                disabled={isClaiming5k}
                                className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-[10px] shadow-xs active:scale-95 transition-all"
                              >
                                {isClaiming5k ? 'Claiming...' : 'Claim 1K 💎'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-ink-muted font-semibold">
                                {compactNumber(views)} / 5K
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── 6. LIVE STREAM SYNERGY ─────────────────────────────────── */}
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

          {/* ── 7. MY CONTENT / REELS & MOMENTS MANAGER ───────────────── */}
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
                {filteredContent.map((item) => {
                  const hasEligibleReward =
                    ((item.viewCount || 0) >= 1000 && !item.claimedViewRewards?.includes('1k')) ||
                    ((item.viewCount || 0) >= 5000 && !item.claimedViewRewards?.includes('5k'));

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedVideo(item)}
                      className="relative rounded-xl overflow-hidden bg-white border border-slate-200/80 cursor-pointer group hover:border-[#22C55E] transition-all flex flex-col shadow-2xs"
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

                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        {/* Video Duration Badge */}
                        {item.mediaType === 'video' && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-0.5">
                            <Play className="w-2.5 h-2.5 fill-current" />
                            {Math.floor((item.durationSec || 25) / 60)}:
                            {String((item.durationSec || 25) % 60).padStart(2, '0')}
                          </span>
                        )}

                        {/* Reward Ready Pill */}
                        {hasEligibleReward && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black shadow-md animate-pulse">
                            🎁 Reward!
                          </span>
                        )}

                        {/* Views overlay */}
                        <span className="absolute bottom-2 left-2 text-white text-xs font-bold flex items-center gap-1 drop-shadow-sm">
                          <Eye className="w-3.5 h-3.5 text-white/90" />
                          {compactNumber(item.viewCount || 0)} views
                        </span>
                      </div>

                      {/* Meta info below image: Post Reaction & Comments Counts per Post */}
                      <div className="p-2.5 bg-white flex-1 flex flex-col justify-between">
                        <p className="text-xs font-semibold text-ink line-clamp-1 leading-snug">
                          {item.content || (item.mediaType === 'video' ? 'Video Reel' : 'Moment Post')}
                        </p>

                        <div className="flex items-center justify-between text-[11px] mt-2 pt-1 border-t border-slate-100">
                          {/* Reactions / Likes */}
                          <span className="flex items-center gap-1 text-rose-500 font-bold" title="Reactions (Likes)">
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span>{compactNumber(item.likes?.length || item.likesCount || 0)}</span>
                          </span>

                          {/* Comments */}
                          <span className="flex items-center gap-1 text-sky-500 font-bold" title="Comments">
                            <MessageCircle className="w-3.5 h-3.5 fill-current" />
                            <span>{compactNumber(item.comments?.length || item.commentsCount || 0)}</span>
                          </span>

                          {/* Date */}
                          <span className="text-[10px] text-ink-muted">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* ── 8. CREATOR MILESTONES & PERKS ──────────────────────────── */}
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

          {/* ── 9. CREATOR ACADEMY & TIPS ──────────────────────────────── */}
          {stats?.academy && stats.academy.length > 0 && (
            <SectionCard
              title="Creator Academy & Pro Tips"
              right={
                <span className="text-xs text-role-primary font-semibold flex items-center gap-0.5">
                  <BookOpen className="w-3.5 h-3.5" /> Best Practices
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                {stats.academy.map((guide, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedAcademy(guide)}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-[#22C55E] transition-all cursor-pointer flex flex-col justify-between shadow-2xs active:scale-[0.99]"
                  >
                    <div>
                      {guide.thumbnail && (
                        <div className="rounded-lg overflow-hidden aspect-video w-full bg-slate-100 mb-2 relative">
                          <img src={guide.thumbnail} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/60 text-white text-[9px] font-bold">
                            {guide.duration}
                          </span>
                        </div>
                      )}
                      <p className="text-xs font-bold text-ink line-clamp-2 leading-snug">{guide.title}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-ink-muted mt-2 pt-1 border-t border-slate-100">
                      <span className="text-[#16A34A] font-semibold">{guide.category || 'Creator'}</span>
                      <span className="flex items-center gap-0.5 text-role-primary font-bold">
                        Read <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── 10. VIDEO DETAIL & REWARD PLAYBACK MODAL ────────────────── */}
      {selectedVideo && (
        <Modal isOpen={!!selectedVideo} onClose={() => setSelectedVideo(null)} title="Reel Details & Rewards">
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

            {/* Comprehensive Per-Post Stats Table */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl text-center border border-slate-200/80">
              <div>
                <p className="text-[10px] text-ink-muted font-bold">Video Views</p>
                <p className="text-xs font-black text-blue-600 mt-0.5">{compactNumber(selectedVideo.viewCount || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted font-bold">Reactions</p>
                <p className="text-xs font-black text-rose-500 mt-0.5">{(selectedVideo.likes || []).length}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted font-bold">Comments</p>
                <p className="text-xs font-black text-sky-500 mt-0.5">{(selectedVideo.comments || []).length}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-muted font-bold">Shares</p>
                <p className="text-xs font-black text-amber-500 mt-0.5">{selectedVideo.shareCount || 0}</p>
              </div>
            </div>

            {/* Video Milestone Rewards in Modal */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                  <Gift className="w-4 h-4 text-amber-600" /> Milestone Diamond Rewards
                </span>
                <span className="text-[10px] font-bold text-amber-700">Per-Video Targets</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1k tier */}
                <div className="p-2 rounded-lg bg-white/90 border border-amber-200 text-center">
                  <p className="text-[10px] font-bold text-ink">1K Views Milestone</p>
                  <p className="text-xs font-black text-amber-600 mt-0.5">💎 200 Diamonds</p>
                  <div className="mt-2">
                    {selectedVideo.claimedViewRewards?.includes('1k') ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Check className="w-3 h-3" /> Claimed
                      </span>
                    ) : (selectedVideo.viewCount || 0) >= 1000 ? (
                      <button
                        onClick={(e) => handleClaimReward(selectedVideo._id, '1k', e)}
                        disabled={claimingKey === `${selectedVideo._id}-1k`}
                        className="w-full py-1 rounded bg-[#22C55E] text-white text-[10px] font-black shadow-xs active:scale-95"
                      >
                        {claimingKey === `${selectedVideo._id}-1k` ? 'Claiming...' : 'Claim 200 💎'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-muted">
                        {compactNumber(selectedVideo.viewCount || 0)} / 1,000 views
                      </span>
                    )}
                  </div>
                </div>

                {/* 5k tier */}
                <div className="p-2 rounded-lg bg-white/90 border border-amber-200 text-center">
                  <p className="text-[10px] font-bold text-ink">5K Views Milestone</p>
                  <p className="text-xs font-black text-amber-600 mt-0.5">💎 1,000 Diamonds</p>
                  <div className="mt-2">
                    {selectedVideo.claimedViewRewards?.includes('5k') ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Check className="w-3 h-3" /> Claimed
                      </span>
                    ) : (selectedVideo.viewCount || 0) >= 5000 ? (
                      <button
                        onClick={(e) => handleClaimReward(selectedVideo._id, '5k', e)}
                        disabled={claimingKey === `${selectedVideo._id}-5k`}
                        className="w-full py-1 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black shadow-xs active:scale-95"
                      >
                        {claimingKey === `${selectedVideo._id}-5k` ? 'Claiming...' : 'Claim 1K 💎'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-ink-muted">
                        {compactNumber(selectedVideo.viewCount || 0)} / 5,000 views
                      </span>
                    )}
                  </div>
                </div>
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
                View in Moments Feed
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

      {/* ── 11. ACADEMY GUIDE READER MODAL ─────────────────────────── */}
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
