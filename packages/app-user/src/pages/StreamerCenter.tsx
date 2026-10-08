import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiArrowUpBold as ArrowUp,
  PiArrowDownBold as ArrowDown,
  PiCaretRightBold as ChevronRight,
  PiLightbulbFill as Lightbulb,
  PiMapPinFill as MapPin,
  PiTagFill as Tag,
  PiCopyBold as Copy,
  PiCheckBold as Check,
  PiCameraFill as Camera,
  PiVideoCameraFill as Video,
  PiSparkleFill as Sparkle,
  PiTrophyFill as Trophy,
  PiCoinsFill as Coins,
  PiUsersThreeFill as Users,
  PiClockFill as Clock,
  PiEyeFill as Eye,
  PiSwordFill as Sword,
  PiGearSixFill as Gear,
  PiCrownFill as Crown,
  PiPhoneCallFill as PhoneCall,
  PiFilmStripFill as Film,
  PiFlameFill as Flame,
  PiShieldCheckFill as ShieldCheck,
  PiSealCheckFill as BadgeCheck,
  PiXBold as CloseIcon,
  PiUploadSimpleBold as UploadIcon,
  PiInfoBold as InfoIcon,
  PiBroadcastFill as BroadcastIcon,
} from 'react-icons/pi';
import {
  streamerApi,
  type InspirationRow,
  type LastStreamReport,
  type StreamerRange,
  type StreamerStats,
  type MilestoneData,
  type StreamHistoryItem,
} from '../api/streamer.api';
import { uploadApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, HelpButton } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { getMediaUrl } from '../lib/media';

const RANGES: { key: StreamerRange; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

const PRESET_TAGS = ['Music', 'PK Battles', 'Talk & Chill', 'Gaming', 'Talent', 'Dance', 'Dating', 'Lifestyle'];

const ROW_TINT: Record<string, string> = {
  title: 'bg-purple-100 text-purple-600',
  tags: 'bg-blue-100 text-blue-600',
  location: 'bg-amber-100 text-amber-600',
  cover: 'bg-pink-100 text-pink-600',
  hours: 'bg-emerald-100 text-emerald-600',
  pk: 'bg-rose-100 text-rose-600',
  wheel: 'bg-indigo-100 text-indigo-600',
  goal: 'bg-amber-100 text-amber-600',
  fanclub: 'bg-fuchsia-100 text-fuchsia-600',
  voice_fx: 'bg-cyan-100 text-cyan-600',
  beauty: 'bg-rose-100 text-rose-600',
};

const ROW_ICON: Record<string, typeof Lightbulb> = {
  title: Lightbulb,
  tags: Tag,
  location: MapPin,
  cover: Camera,
  hours: Clock,
  pk: Sword,
  wheel: Sparkle,
  goal: Trophy,
  fanclub: Crown,
  voice_fx: Video,
  beauty: Sparkle,
};

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const StreamerCenter = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [range, setRange] = useState<StreamerRange>('today');
  const [inspirationTab, setInspirationTab] = useState<'guidelines' | 'tools'>('guidelines');
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [report, setReport] = useState<LastStreamReport | null>(null);
  const [inspiration, setInspiration] = useState<{ guidelines: InspirationRow[]; tools: InspirationRow[] } | null>(null);
  const [milestones, setMilestones] = useState<MilestoneData | null>(null);
  const [history, setHistory] = useState<StreamHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUid, setCopiedUid] = useState(false);

  // Modals state
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<InspirationRow | null>(null);

  // Cover upload state
  const [coverInputUrl, setCoverInputUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [defaultTitle, setDefaultTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Fetch streamer dashboard data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      optional(streamerApi.getStats(range)).catch(() => null),
      optional(streamerApi.getLastReport()).catch(() => null),
      optional(streamerApi.getInspiration()).catch(() => null),
      optional(streamerApi.getMilestones()).catch(() => null),
      optional(streamerApi.getHistory(1, 10)).catch(() => null),
    ])
      .then(([s, r, i, m, h]) => {
        if (cancelled) return;
        if (s?.data) setStats(s.data);
        if (r?.data) setReport(r.data);
        if (i?.data) setInspiration(i.data);
        if (m?.data) setMilestones(m.data);
        if (h?.data) setHistory(h.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  // Copy UID helper
  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    showToast('Streamer ID copied to clipboard!', 'success');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Upload and change cover photo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const url = await uploadApi.upload(file, 'streamer_covers');
      await streamerApi.updateCover(url);
      updateUser({ cover: url });
      setReport((prev) => (prev ? { ...prev, cover: url } : prev));
      showToast('Live stream cover updated successfully!', 'success');
      setShowCoverModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload cover photo', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSaveCoverUrl = async () => {
    if (!coverInputUrl.trim()) {
      showToast('Please enter a valid image URL', 'error');
      return;
    }
    try {
      setUploadingCover(true);
      await streamerApi.updateCover(coverInputUrl.trim());
      updateUser({ cover: coverInputUrl.trim() });
      setReport((prev) => (prev ? { ...prev, cover: coverInputUrl.trim() } : prev));
      showToast('Live stream cover updated successfully!', 'success');
      setShowCoverModal(false);
      setCoverInputUrl('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update cover URL', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Save stream settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await streamerApi.updateSettings({
        title: defaultTitle.trim() || undefined,
        tags: selectedTags,
        locationEnabled,
      });
      showToast('Stream default settings saved!', 'success');
      setShowSettingsModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const currentCover = user?.cover || report?.cover || user?.avatar || '';
  const rows =
    inspirationTab === 'guidelines'
      ? inspiration?.guidelines ?? []
      : inspiration?.tools ?? [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-28 font-sans selection:bg-purple-500 selection:text-white">
      {/* Top App Header */}
      <ScreenHeader
        title="Streamer Center"
        variant="media"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/90 transition-all"
              title="Stream Settings"
            >
              <Gear className="w-4 h-4" />
            </button>
            <HelpButton light />
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center pt-24 space-y-4">
          <Loading size="lg" />
          <p className="text-xs text-slate-400 font-medium animate-pulse">Loading Streamer Studio...</p>
        </div>
      ) : (
        <div className="px-4 space-y-4 max-w-md mx-auto">
          {/* 1. HERO PROFILE CARD */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/90 via-indigo-950 to-slate-900 border border-purple-500/20 p-4 shadow-xl backdrop-blur-md">
            {/* Background Glows */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-start gap-3.5">
              {/* Avatar with Live Border */}
              <div className="relative shrink-0">
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 shadow-md">
                  <Avatar src={user?.avatar} nickname={user?.nickname || 'Streamer'} size="lg" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-black text-white shadow-sm flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" /> Lv.{stats?.level ?? user?.liveLevel ?? 1}
                </span>
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-white text-base truncate">{user?.nickname || 'Streamer'}</h2>
                  {user?.verification?.verified && (
                    <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" title="Verified Host" />
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleCopyUid}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/15 text-[11px] text-slate-300 font-mono transition-colors"
                  >
                    <span>ID: {user?.uid || '—'}</span>
                    {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>

                  <button
                    onClick={() => navigate('/agency')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[11px] text-purple-300 font-semibold truncate hover:bg-purple-500/30"
                  >
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    <span className="truncate">{stats?.agencyName || 'Independent Host'}</span>
                  </button>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ready to Stream
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Hero Banner Footer */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={() => setShowCoverModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition-all active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-pink-400" />
                <span>Live Cover</span>
              </button>

              <button
                onClick={() => navigate('/go-live')}
                className="flex-1 max-w-[140px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs font-bold text-white shadow-md shadow-purple-500/20 active:scale-95 transition-all"
              >
                <BroadcastIcon className="w-3.5 h-3.5" />
                <span>Go Live</span>
              </button>
            </div>
          </div>

          {/* Quick Hub Navigation Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate('/creator-center')}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 shadow-md active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-white truncate">Creator Center</p>
                <p className="text-[10px] text-slate-400 truncate">Reels & Watch Time</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/watch-history')}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-2.5 shadow-md active:scale-[0.98] transition-all"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-white truncate">Watch History</p>
                <p className="text-[10px] text-slate-400 truncate">Live & Video History</p>
              </div>
            </button>
          </div>

          {/* 2. LIVE STREAM METRICS CARD */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/60 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Live Stream Data</h3>
              </div>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-0.5 active:translate-x-0.5 transition-transform"
              >
                History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Range Tabs */}
            <div className="mb-4">
              <PillTabs
                tabs={RANGES.map((r) => ({ key: r.key, label: r.label }))}
                active={range}
                onChange={setRange}
                className="bg-slate-900/80 p-1 rounded-2xl border border-slate-700/50"
              />
            </div>

            {/* Metrics 4-Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Duration */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/40 p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Streaming Time
                  </span>
                  {stats?.trend?.liveDuration === 'up' ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-rose-400" />
                  )}
                </div>
                <p className="mt-2 text-lg font-black text-white font-mono tracking-tight">
                  {formatDuration(stats?.liveDurationSec ?? 0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {stats?.streamCount ? `${stats.streamCount} live sessions` : '0 sessions'}
                </p>
              </div>

              {/* Diamond Revenue */}
              <div
                onClick={() => navigate('/income')}
                className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/40 p-3 flex flex-col justify-between cursor-pointer hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1 font-medium">
                    <Coins className="w-3.5 h-3.5 text-amber-400" /> Diamonds Earned
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </div>
                <p className="mt-2 text-lg font-black text-amber-300 font-mono tracking-tight">
                  {(stats?.diamondsEarned ?? stats?.pointsEarned ?? 0).toLocaleString()} 💎
                </p>
                <p className="text-[10px] text-purple-400 font-semibold mt-0.5">Tap to view income →</p>
              </div>

              {/* New Followers */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/40 p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-3.5 h-3.5 text-pink-400" /> Total Followers
                  </span>
                  <ArrowUp className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="mt-2 text-lg font-black text-white font-mono tracking-tight">
                  {(stats?.newFollowers ?? user?.followers?.length ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Community growth</p>
              </div>

              {/* Viewers */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/40 p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="flex items-center gap-1 font-medium">
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> Avg Viewers
                  </span>
                  {stats?.trend?.avgConcurrentUsers === 'up' ? (
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-rose-400" />
                  )}
                </div>
                <p className="mt-2 text-lg font-black text-white font-mono tracking-tight">
                  {stats?.avgConcurrentUsers ?? 0}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Peak: {stats?.peakConcurrentUsers ?? stats?.avgConcurrentUsers ?? 0} concurrent
                </p>
              </div>
            </div>
          </div>

          {/* 3. LAST STREAM REPORT & AI COACH */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/60 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                  <Sparkle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Last Stream Performance</h3>
                  <p className="text-[11px] text-slate-400">
                    {report?.startedAt ? `${new Date(report.startedAt).toLocaleString()}` : 'No recent stream recorded'}
                  </p>
                </div>
              </div>

              {report?.aiScore && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
                  Score {report.aiScore}/100
                </span>
              )}
            </div>

            {report ? (
              <div className="space-y-3">
                {/* Cover & AI Scoring Banner */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/20">
                  <div className="relative w-16 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-white/10 group">
                    {currentCover ? (
                      <img src={getMediaUrl(currentCover)} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-900/40 text-purple-400">
                        <Video className="w-6 h-6" />
                      </div>
                    )}
                    <button
                      onClick={() => setShowCoverModal(true)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-snug font-medium line-clamp-2">
                      {report.aiFeedback ||
                        (report.aiScoreStatus === 'in_progress'
                          ? 'AI scoring in progress — start your next stream to increase engagement!'
                          : 'Your stream engagement was strong. Keep up high energy and interaction!')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => setShowCoverModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[11px] font-bold transition-colors"
                      >
                        Change Cover
                      </button>
                      <button
                        onClick={() => navigate('/go-live')}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 text-[11px] font-bold transition-colors"
                      >
                        Stream Again
                      </button>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  <div className="bg-slate-900/80 p-2 rounded-xl text-center border border-slate-700/30">
                    <p className="text-[10px] text-slate-400">Duration</p>
                    <p className="text-xs font-bold text-white font-mono mt-0.5">
                      {formatDuration(report.liveDurationSec)}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl text-center border border-slate-700/30">
                    <p className="text-[10px] text-slate-400">Viewers</p>
                    <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5">{report.viewers}</p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl text-center border border-slate-700/30">
                    <p className="text-[10px] text-slate-400">Diamonds</p>
                    <p className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                      {report.pointsEarned.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl text-center border border-slate-700/30">
                    <p className="text-[10px] text-slate-400">Followers</p>
                    <p className="text-xs font-bold text-purple-300 font-mono mt-0.5">+{report.newFollowers}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <Video className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-300">No Streams Recorded Yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Go live now to start building your audience and generating diamonds!
                </p>
                <button
                  onClick={() => navigate('/go-live')}
                  className="mt-3 px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  Start Your First Stream
                </button>
              </div>
            )}
          </div>

          {/* 4. STREAMER LEVEL & MONTHLY MILESTONES */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/60 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Monthly Host Milestones</h3>
                  <p className="text-[11px] text-slate-400">Level {milestones?.currentLevel ?? 1} • {milestones?.levelTitle ?? 'Host'}</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/levels')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5"
              >
                Privileges <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Level Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Monthly Broadcast Goal</span>
                <span className="text-amber-400 font-bold font-mono">
                  {Math.round(((stats?.liveDurationSec ?? 0) / 3600) * 10) / 10} / {milestones?.monthlyTargetHours ?? 30} hrs
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((((stats?.liveDurationSec ?? 0) / 3600) / (milestones?.monthlyTargetHours ?? 30)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Milestone Rewards Strip */}
            <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-700/40">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/30 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">Entry Badge & Effect</p>
                  <p className="text-[10px] text-emerald-400 font-medium">Unlocked at Lv.5</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/30 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-white truncate">+5% Income Bonus</p>
                  <p className="text-[10px] text-amber-400 font-medium">Unlocked at Lv.10</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. STREAMER STUDIO QUICK TOOLS GRID */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/60 p-4 shadow-lg backdrop-blur-sm">
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Sparkle className="w-4 h-4 text-purple-400" />
              Streamer Studio Tools
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {/* PK Battles */}
              <button
                onClick={() => navigate('/match')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Sword className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">PK Match</span>
              </button>

              {/* Income */}
              <button
                onClick={() => navigate('/income')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Coins className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Income</span>
              </button>

              {/* Agency */}
              <button
                onClick={() => navigate('/agency')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">My Agency</span>
              </button>

              {/* Leaderboard */}
              <button
                onClick={() => navigate('/rankings?board=live')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Rankings</span>
              </button>

              {/* Fan Club */}
              <button
                onClick={() => navigate('/fan-club')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Crown className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Fan Club</span>
              </button>

              {/* 1v1 Call Price */}
              <button
                onClick={() => navigate('/call-price')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Call Rate</span>
              </button>

              {/* Lucky Spin */}
              <button
                onClick={() => navigate('/lucky-spin')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Sparkle className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Lucky Spin</span>
              </button>

              {/* Creator Center */}
              <button
                onClick={() => navigate('/creator-center')}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-700/50 border border-slate-700/40 active:scale-95 transition-all text-center group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-200">Creator Hub</span>
              </button>
            </div>
          </div>

          {/* 6. STREAM INSPIRATION & GUIDELINES MASTERCLASS */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/60 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                Stream Masterclass & Tools
              </h3>
            </div>

            {/* Sub-tabs */}
            <div className="mb-3">
              <PillTabs
                tabs={[
                  { key: 'guidelines', label: 'Going Live Guidelines' },
                  { key: 'tools', label: 'Interactivity Tools' },
                ]}
                active={inspirationTab}
                onChange={(k) => setInspirationTab(k as 'guidelines' | 'tools')}
                className="bg-slate-900/80 p-1 rounded-2xl border border-slate-700/50"
              />
            </div>

            {/* List */}
            <div className="space-y-2">
              {rows.map((row) => {
                const Icon = ROW_ICON[row.key] ?? Lightbulb;
                return (
                  <button
                    key={row.key}
                    onClick={() => {
                      if (row.route) {
                        navigate(row.route);
                      } else {
                        setSelectedGuideline(row);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-700/40 border border-slate-700/30 text-left transition-all active:scale-[0.99] group"
                  >
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        ROW_TINT[row.key] ?? 'bg-purple-900/40 text-purple-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-200 text-xs truncate group-hover:text-white transition-colors">
                          {row.title}
                        </p>
                        {row.badge && (
                          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold shrink-0">
                            {row.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{row.description}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS & DRAWERS ── */}

      {/* 1. CHANGE COVER MODAL */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Update Stream Cover</h3>
              <button
                onClick={() => setShowCoverModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Current Cover Preview */}
            <div className="relative w-full h-44 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
              {coverInputUrl || currentCover ? (
                <img
                  src={getMediaUrl(coverInputUrl || currentCover)}
                  alt="Live Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-slate-500">
                  <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">No cover photo set</p>
                </div>
              )}
            </div>

            {/* File Upload Button */}
            <input
              type="file"
              ref={coverFileRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => coverFileRef.current?.click()}
              disabled={uploadingCover}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95"
            >
              {uploadingCover ? (
                <Loading size="sm" />
              ) : (
                <>
                  <UploadIcon className="w-4 h-4" />
                  <span>Upload from Gallery</span>
                </>
              )}
            </button>

            {/* Or URL input */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-[11px] text-slate-400 font-medium">Or paste image URL:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  value={coverInputUrl}
                  onChange={(e) => setCoverInputUrl(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSaveCoverUrl}
                  disabled={uploadingCover || !coverInputUrl.trim()}
                  className="px-3 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-xs font-bold text-white transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. STREAM SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Stream Preferences</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Default Title */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">Default Stream Title</label>
              <input
                type="text"
                placeholder="e.g. 🔥 Weekend Party & Singing Session!"
                value={defaultTitle}
                onChange={(e) => setDefaultTitle(e.target.value)}
                maxLength={40}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
              />
              <p className="text-[10px] text-slate-500">{defaultTitle.length}/40 characters</p>
            </div>

            {/* Tag Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-semibold">Categories / Tags (Pick up to 3)</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Switch */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200">Location Recommendation</p>
                <p className="text-[10px] text-slate-400">Boost discovery among nearby users</p>
              </div>
              <button
                onClick={() => setLocationEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  locationEnabled ? 'bg-purple-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    locationEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg disabled:opacity-50 transition-all active:scale-95"
            >
              {savingSettings ? <Loading size="sm" /> : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* 3. STREAM HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <h3 className="font-bold text-white text-base">Past Broadcast History</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No broadcast sessions found yet.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item._id} className="pt-2 first:pt-0 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                      {item.cover ? (
                        <img src={getMediaUrl(item.cover)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-400 bg-purple-950/40">
                          <Video className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.startedAt).toLocaleDateString()} • {formatDuration(item.durationSec)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-300">
                        <span className="text-emerald-400 font-semibold">{item.viewers} Viewers</span>
                        <span>•</span>
                        <span className="capitalize text-slate-400">{item.category}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. GUIDELINE DETAIL MODAL */}
      {selectedGuideline && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    ROW_TINT[selectedGuideline.key] ?? 'bg-purple-900/40 text-purple-400'
                  }`}
                >
                  <InfoIcon className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-white text-sm truncate">{selectedGuideline.title}</h3>
              </div>
              <button
                onClick={() => setSelectedGuideline(null)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{selectedGuideline.description}</p>

            {selectedGuideline.tips && selectedGuideline.tips.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] font-bold text-purple-300">Pro Tips for Maximum Impact:</p>
                <ul className="space-y-1">
                  {selectedGuideline.tips.map((tip, idx) => (
                    <li key={idx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedGuideline(null);
                navigate('/go-live');
              }}
              className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors"
            >
              Apply in Next Stream →
            </button>
          </div>
        </div>
      )}

      {/* ── STICKY BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-3 z-30 flex items-center gap-3">
        <button
          onClick={() => setShowSettingsModal(true)}
          className="h-12 w-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 border border-slate-700 transition-all active:scale-95"
          title="Stream Settings"
        >
          <Gear className="w-5 h-5" />
        </button>

        <button
          onClick={() => navigate('/go-live')}
          className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <BroadcastIcon className="w-5 h-5 animate-pulse" />
          <span>START STREAMING NOW</span>
        </button>
      </div>
    </div>
  );
};
