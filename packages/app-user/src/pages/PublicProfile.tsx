import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCakeFill as Cake,
  PiCopyFill as Copy,
  PiCheckBold as Check,
  PiFlagFill as Flag,
  PiMapPinFill as MapPin,
  PiChatCircleFill as MessageCircle,
  PiUserFill as UserIcon,
  PiPhoneFill as Phone,
  PiVideoCameraFill as VideoCamera,
  PiShareNetworkFill as Share2,
  PiXBold as CloseIcon,
  PiArrowsOutSimpleBold as ExpandIcon,
  PiCameraFill as CameraIcon,
  PiSparkleFill as Sparkles,
  PiGenderMaleBold as MaleIcon,
  PiGenderFemaleBold as FemaleIcon,
  PiBroadcastFill as BroadcastIcon,
  PiShieldCheckFill as ShieldCheck,
} from 'react-icons/pi';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';
import { chatApi, usersApi, callApi } from '../api';
import {
  Avatar,
  FollowButton,
  ProfileStatsRow,
  RoleTags,
  UserNameplate,
  LiveLevelPill,
  WealthLevelPill,
  HostBadge,
  EquippedBadge,
  LevelDetailSheet,
  VerifiedBadge,
  NobleBadge,
} from '../components/user';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { ReportModal } from '../components/report/ReportModal';
import { Loading, ImageLightboxModal } from '../components/ui';
import { InsufficientCoinsModal } from '../components/call/InsufficientCoinsModal';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';
import { countryLabel, flagEmoji } from '../lib/countries';
import { getMediaUrl } from '../lib/media';
import { calculateWealthLevel, calculateLiveLevel, formatLiveTime } from '../lib/userLevels';
import type { PublicProfile as PublicProfileData } from '../types';

export const PublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Lightbox Preview Modal for Picture & Cover
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Level Detail Sheet
  const [showLevelSheet, setShowLevelSheet] = useState(false);
  const [levelSheetTab, setLevelSheetTab] = useState<'wealth' | 'live'>('wealth');

  // Call state
  const [insufficientCoins, setInsufficientCoins] = useState<{
    visible: boolean;
    reason?: string;
    coinsPerMinute?: number;
    balance?: number;
    minBalance?: number;
  }>({ visible: false });

  const [activeCall, setActiveCall] = useState<{
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    coinsPerMinute: number;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    usersApi
      .getPublicProfile(id)
      .then(({ data }) => {
        if (!cancelled && data.success) setProfile(data.data as PublicProfileData);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isSelf = Boolean(profile && user && (profile._id === user._id || profile.uid === user.uid));

  // Calculated Levels
  const wealthInfo = useMemo(() => {
    const rawExp = Math.max(profile?.wealthExp || 0, ((profile?.coins || 0) + (profile?.diamonds || 0)));
    return calculateWealthLevel(rawExp, profile?.wealthLevel || profile?.level);
  }, [profile]);

  const liveInfo = useMemo(() => {
    const minutes =
      profile?.liveStreamMinutes ||
      (profile?.liveStreamSeconds ? Math.floor(profile.liveStreamSeconds / 60) : 0);
    return calculateLiveLevel(minutes, profile?.liveLevel || profile?.level);
  }, [profile]);

  // Socket listener for call accept & end
  useEffect(() => {
    if (!socket || !activeCall?.callId) return;

    const onCallAccept = (payload: any) => {
      if (payload?.callId === activeCall.callId) {
        setCallAccepted(true);
      }
    };
    const onCallEnd = (payload: any) => {
      if (payload?.callId === activeCall.callId) {
        setActiveCall(null);
        setCallAccepted(false);
      }
    };

    socket.on('call:accept', onCallAccept);
    socket.on('call:end', onCallEnd);

    return () => {
      socket.off('call:accept', onCallAccept);
      socket.off('call:end', onCallEnd);
    };
  }, [socket, activeCall?.callId]);

  // Real-time visitor cleared sync
  useEffect(() => {
    const handleVisitorsCleared = () => {
      setProfile((prev) => (prev ? { ...prev, visitors: 0 } : prev));
    };

    window.addEventListener('visitors:cleared', handleVisitorsCleared);
    if (socket) {
      socket.on('stats:visitors-cleared', handleVisitorsCleared);
    }
    return () => {
      window.removeEventListener('visitors:cleared', handleVisitorsCleared);
      if (socket) {
        socket.off('stats:visitors-cleared', handleVisitorsCleared);
      }
    };
  }, [socket]);

  const startProfileCall = async (type: 'audio' | 'video') => {
    if (!profile?._id) return;

    // Check & request camera/mic permissions
    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Media permission denied', 'error');
      return;
    }

    try {
      // 1. Balance Check & Price Quote
      const { data: quoteRes } = await callApi.getQuote(profile._id);
      if (quoteRes.success && quoteRes.data) {
        if (!quoteRes.data.canCall) {
          setInsufficientCoins({
            visible: true,
            reason: quoteRes.data.reason,
            coinsPerMinute: quoteRes.data.coinsPerMinute,
            balance: quoteRes.data.balance,
            minBalance: quoteRes.data.minBalance,
          });
          return;
        }
      }

      // 2. Start Call Request
      setCallAccepted(false);
      const { data } = await callApi.create([profile._id], type, 'profile');
      if (data.success && data.data) {
        setActiveCall({
          callId: data.data.callId,
          channel: data.data.channel,
          type: data.data.type,
          token: data.data.token,
          coinsPerMinute: data.data.coinsPerMinute || quoteRes?.data?.coinsPerMinute || profile?.callPricePerMinute || 1000,
          recipientOnline: data.data.recipientOnline,
        });
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      if (err.response?.status === 402 || errorData?.error?.includes('Insufficient Coins')) {
        const rate = profile?.callPricePerMinute || quoteRes?.data?.coinsPerMinute || 1000;
        setInsufficientCoins({
          visible: true,
          reason: errorData?.error || 'Insufficient Coins to start call',
          coinsPerMinute: rate,
          balance: user?.coins || 0,
          minBalance: rate * 1,
        });
      } else {
        showToast(errorData?.error || err.message || 'Could not start call', 'error');
      }
    }
  };

  const handleMessage = async () => {
    if (!profile?._id) return;
    try {
      const { data } = await chatApi.getOrCreateChat(profile._id);
      if (data.success) navigate(`/chat/${data.data._id}`);
    } catch {
      showToast('Could not open chat thread', 'error');
    }
  };

  const copyUid = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.uid);
      setCopied(true);
      showToast('User ID copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.nickname || 'User'} on Navo Live`,
          text: `Check out ${profile?.nickname || 'this user'}'s profile on Navo Live!`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        showToast('Profile link copied to clipboard!', 'success');
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center">
        <Loading size="lg" />
        <span className="text-xs text-ink-muted mt-2 font-medium">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-3xl mb-3">
          🔍
        </div>
        <p className="text-base font-extrabold text-ink mb-1">User Not Found</p>
        <p className="text-xs text-ink-muted max-w-xs mb-4">
          This account may have been deleted, moved, or the ID is incorrect.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="h-10 px-5 rounded-full bg-black text-white text-xs font-bold active:scale-95 transition-transform"
        >
          Go Back
        </button>
      </div>
    );
  }

  const coverMediaUrl = profile.cover ? getMediaUrl(profile.cover) : null;
  const avatarMediaUrl = profile.avatar ? getMediaUrl(profile.avatar) : null;

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24 select-none">
      {/* ── Cover Photo Banner (Interactive & Clickable) ─────────── */}
      <div className="relative">
        <div
          onClick={() => {
            if (coverMediaUrl) {
              setPreviewImage({
                url: coverMediaUrl,
                title: `${profile.nickname}'s Cover Photo`,
              });
            } else if (avatarMediaUrl) {
              setPreviewImage({
                url: avatarMediaUrl,
                title: `${profile.nickname}'s Photo`,
              });
            }
          }}
          className="h-52 w-full overflow-hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 relative group cursor-pointer"
          title="Click to view full cover"
        >
          {coverMediaUrl ? (
            <img
              src={coverMediaUrl}
              alt="Cover photo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-pink-500/30 flex items-center justify-center">
              <span className="text-xs text-white/50 font-medium flex items-center gap-1.5">
                <CameraIcon className="w-4 h-4" />
                <span>Tap to view photo</span>
              </span>
            </div>
          )}

          {/* Vignette gradients for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Expand Cover Pill */}
          {coverMediaUrl && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
              <ExpandIcon className="w-3 h-3" />
              <span>View Cover</span>
            </div>
          )}
        </div>

        {/* Top Floating Action Bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3 h-14 z-20">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              aria-label="Share Profile"
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
              title="Share Profile"
            >
              {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {!isSelf && (
              <button
                onClick={() => setShowReport(true)}
                aria-label="Report this user"
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform shadow-md"
                title="Report User"
              >
                <Flag className="w-4 h-4 text-rose-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Profile Header Card ──────────────────────────────── */}
      <div className="bg-white mx-3 -mt-10 rounded-3xl p-4 shadow-sm border border-gray-100/80 relative z-10">
        <div className="flex items-start justify-between gap-3 -mt-12">
          {/* Avatar (Clickable with Lightbox Preview) */}
          <div className="relative group">
            <button
              onClick={() => {
                if (avatarMediaUrl) {
                  setPreviewImage({
                    url: avatarMediaUrl,
                    title: `${profile.nickname}'s Profile Picture`,
                  });
                }
              }}
              className="ring-4 ring-white rounded-full bg-white shadow-lg shrink-0 active:scale-95 transition-transform block relative overflow-hidden"
              title="Click to view full picture"
            >
              <Avatar
                src={profile.avatar}
                nickname={profile.nickname}
                size="2xl"
                online={Boolean(profile.online)}
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-full">
                <ExpandIcon className="w-5 h-5 drop-shadow" />
              </div>
            </button>
          </div>

          {/* Quick Actions (when viewing another user) */}
          {!isSelf && (
            <div className="flex items-center gap-1.5 pt-12 flex-wrap justify-end">
              {/* Call Rate Badge */}
              <div className="h-9 px-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-2xs">
                <CoinIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{(profile.callPricePerMinute ?? 1000).toLocaleString()} Coins / min</span>
              </div>

              <button
                onClick={() => startProfileCall('audio')}
                className="h-9 px-3 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold inline-flex items-center gap-1.5 active:bg-emerald-100 transition-all shadow-2xs border border-emerald-200/60 active:scale-95"
                title={`Audio Call (${(profile.callPricePerMinute ?? 1000).toLocaleString()} Coins/min)`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call</span>
              </button>

              <button
                onClick={() => startProfileCall('video')}
                className="h-9 px-3 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 active:bg-indigo-100 transition-all shadow-2xs border border-indigo-200/60 active:scale-95"
                title={`Video Call (${(profile.callPricePerMinute ?? 1000).toLocaleString()} Coins/min)`}
              >
                <VideoCamera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Video</span>
              </button>

              <button
                onClick={handleMessage}
                className="h-9 px-3.5 rounded-full bg-gray-100 text-ink text-xs font-bold inline-flex items-center gap-1.5 active:bg-gray-200 transition-all active:scale-95"
                title="Send Message"
              >
                <MessageCircle className="w-3.5 h-3.5 text-gray-700" />
                <span>Chat</span>
              </button>

              <FollowButton
                targetUserId={profile._id}
                initialFollowing={Boolean(profile.isFollowing)}
                size="md"
              />
            </div>
          )}

          {/* Quick Actions (when viewing own profile) */}
          {isSelf && (
            <div className="flex items-center gap-1.5 pt-12 flex-wrap justify-end">
              <button
                onClick={() => navigate('/call-price')}
                className="h-9 px-3.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 text-xs font-black inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
                title="Configure your 1:1 call per-minute rate"
              >
                <CoinIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Rate: {((user as any)?.callPricePerMinute ?? profile.callPricePerMinute ?? 1000).toLocaleString()} Coins / min</span>
                <span className="text-[10px] text-amber-600 underline font-bold ml-0.5">Edit</span>
              </button>
            </div>
          )}
        </div>

        {/* User Details & Nameplate */}
        <div className="mt-3">
          {/* Row 1: Nickname + Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-black text-ink text-xl tracking-tight uppercase leading-snug">
              {profile.nickname}
            </h1>

            {profile.verification?.verified && (
              <VerifiedBadge className="w-4 h-4 inline-block text-sky-500" />
            )}

            {profile.hostBadge && profile.hostBadge !== 'none' && (
              <HostBadge badge={profile.hostBadge} size="sm" />
            )}

            {profile.equippedBadge && (
              <EquippedBadge
                badge={profile.equippedBadge}
                size="sm"
                animated={true}
              />
            )}

            {profile.noble && (
              <NobleBadge tier={profile.noble as any} className="h-4" />
            )}
          </div>

          {/* Role tags */}
          <div className="mt-1.5">
            <RoleTags user={profile as any} size="sm" />
          </div>

          {/* Row 2: Live Level + Wealth Level + ID */}
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <LiveLevelPill
              level={liveInfo.level}
              onClick={() => {
                setLevelSheetTab('live');
                setShowLevelSheet(true);
              }}
            />

            <WealthLevelPill
              level={wealthInfo.level}
              onClick={() => {
                setLevelSheetTab('wealth');
                setShowLevelSheet(true);
              }}
            />

            {/* ID Badge with 1-click Copy */}
            <button
              onClick={copyUid}
              className="h-6 px-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-mono font-bold flex items-center gap-1 active:scale-95 transition-transform"
              title="Click to copy ID"
            >
              <span>ID: {profile.uid}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
            </button>

            {/* 1:1 Call Rate Pill */}
            <div
              onClick={() => isSelf && navigate('/call-price')}
              className={`h-6 px-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[11px] font-bold flex items-center gap-1 shadow-2xs ${
                isSelf ? 'cursor-pointer hover:bg-amber-500/20 active:scale-95 transition-transform' : ''
              }`}
              title="1:1 Call Rate (Coins per minute)"
            >
              <CoinIcon className="w-3.5 h-3.5 text-amber-500" />
              <span>{((isSelf ? (user as any)?.callPricePerMinute : profile.callPricePerMinute) ?? 1000).toLocaleString()} Coins/min</span>
            </div>

            {/* Mutual Follow / Friend Tag */}
            {profile.isFriend && (
              <span className="h-6 px-2.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center shadow-xs">
                Mutual Friends
              </span>
            )}
            {!profile.isFriend && profile.isFollowedBy && (
              <span className="h-6 px-2 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 flex items-center">
                Follows You
              </span>
            )}
          </div>

          {/* Row 3: Gender, Age & Location Chips */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {profile.gender && profile.gender !== 'unspecified' && (
              <span
                className={`h-6 px-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-2xs ${
                  profile.gender === 'male'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : profile.gender === 'female'
                    ? 'bg-pink-50 text-pink-700 border border-pink-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                {profile.gender === 'male' ? (
                  <MaleIcon className="w-3 h-3" />
                ) : profile.gender === 'female' ? (
                  <FemaleIcon className="w-3 h-3" />
                ) : (
                  <UserIcon className="w-3 h-3" />
                )}
                <span>{profile.age ? `${profile.age}` : profile.gender}</span>
              </span>
            )}

            {typeof profile.age === 'number' && !profile.gender && (
              <span className="h-6 px-2.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1">
                <Cake className="w-3 h-3 text-amber-500" />
                <span>{profile.age} yrs</span>
              </span>
            )}

            {profile.country && (
              <span className="h-6 px-2.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1">
                <span>{flagEmoji(profile.country)}</span>
                <span>{countryLabel(profile.country)}</span>
              </span>
            )}
          </div>

          {/* Bio text */}
          {profile.bio && (
            <div className="mt-3.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs text-gray-700 leading-relaxed">
              <p className="italic">"{profile.bio}"</p>
            </div>
          )}

          {/* Tags */}
          {profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {profile.tags.map((tag) => (
                <span
                  key={tag}
                  className="h-6 px-2.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold inline-flex items-center border border-indigo-100"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Interactive Stats Row ──────────────────────────────────── */}
      <div className="bg-white mx-3 mt-3 rounded-3xl py-3 px-2 shadow-2xs border border-gray-100">
        <ProfileStatsRow
          userId={profile._id}
          stats={profile}
          showVisitors={isSelf}
        />
      </div>

      {/* ── Level & Privileges Showcase Card ───────────────────────── */}
      <div className="bg-white mx-3 mt-3 rounded-3xl p-4 shadow-2xs border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-ink text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Levels & Badges</span>
          </h2>
          <button
            onClick={() => {
              setLevelSheetTab('wealth');
              setShowLevelSheet(true);
            }}
            className="text-xs font-bold text-accent-600 hover:underline"
          >
            View Details
          </button>
        </div>

        {/* Wealth Level Ladder */}
        <div
          onClick={() => {
            setLevelSheetTab('wealth');
            setShowLevelSheet(true);
          }}
          className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-300/40 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <DiamondIcon className="w-4 h-4 text-cyan-500" />
              <span>Wealth Level</span>
            </span>
            <span className="text-xs font-black text-amber-600">Lv.{wealthInfo.level}</span>
          </div>

          <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, wealthInfo.progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-amber-800/80 mt-1 font-semibold">
            <span>Exp: {wealthInfo.currentPoints.toLocaleString()}</span>
            <span>Next: {wealthInfo.tierNext === Infinity ? 'MAX' : wealthInfo.tierNext.toLocaleString()}</span>
          </div>
        </div>

        {/* Live Level Ladder */}
        <div
          onClick={() => {
            setLevelSheetTab('live');
            setShowLevelSheet(true);
          }}
          className="p-3 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-indigo-500/10 border border-sky-300/40 cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-sky-900 flex items-center gap-1.5">
              <BroadcastIcon className="w-4 h-4 text-sky-600" />
              <span>Live Level (Broadcast Time)</span>
            </span>
            <span className="text-xs font-black text-sky-600">Lv.{liveInfo.level}</span>
          </div>

          <div className="h-2 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, liveInfo.progress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-sky-800/80 mt-1 font-semibold">
            <span>Streamed: {formatLiveTime(liveInfo.currentPoints)}</span>
            <span>Next: {liveInfo.tierNext === Infinity ? 'MAX' : formatLiveTime(liveInfo.tierNext)}</span>
          </div>
        </div>
      </div>

      {/* ── Interactive Lightbox Photo Viewer Modal ───────────────── */}
      {previewImage && (
        <ImageLightboxModal
          isOpen={Boolean(previewImage)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={`ID: ${profile.uid}`}
          avatar={profile.avatar}
          nickname={profile.nickname}
          onClose={() => setPreviewImage(null)}
          onEdit={isSelf ? () => navigate('/settings') : undefined}
        />
      )}

      {/* Level Detail Sheet Drawer */}
      <LevelDetailSheet
        isOpen={showLevelSheet}
        onClose={() => setShowLevelSheet(false)}
        initialTab={levelSheetTab}
        userWealthExp={profile.wealthExp || profile.diamonds || 0}
        userLiveTimeMinutes={
          profile.liveStreamMinutes ||
          (profile.liveStreamSeconds ? Math.floor(profile.liveStreamSeconds / 60) : 0)
        }
      />

      {/* Report Modal */}
      {showReport && (
        <ReportModal
          targetType="user"
          targetId={profile._id}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Insufficient Coins Modal */}
      <InsufficientCoinsModal
        visible={insufficientCoins.visible}
        reason={insufficientCoins.reason}
        coinsPerMinute={insufficientCoins.coinsPerMinute}
        balance={insufficientCoins.balance}
        minBalance={insufficientCoins.minBalance}
        onClose={() => setInsufficientCoins({ visible: false })}
      />

      {/* Active Call Screen */}
      {activeCall && (
        <CallScreen
          outgoing={{
            callId: activeCall.callId,
            channel: activeCall.channel,
            type: activeCall.type,
            token: activeCall.token,
            isFreeMinuteApplied: activeCall.isFreeMinuteApplied,
            callee: {
              nickname: profile.nickname,
              avatar: profile.avatar,
              online: Boolean(activeCall.recipientOnline ?? profile.online),
            },
          }}
          isFreeMinuteApplied={activeCall.isFreeMinuteApplied}
          accepted={callAccepted}
          coinsPerMinute={activeCall.coinsPerMinute}
          isAudience={true}
          onClose={() => {
            setActiveCall(null);
            setCallAccepted(false);
          }}
        />
      )}
    </div>
  );
};
