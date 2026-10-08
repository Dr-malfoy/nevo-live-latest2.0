import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold,
  PiLockKeyFill,
  PiGlobeFill,
  PiCopyFill,
  PiCrownFill,
  PiUsersFill,
  PiCoinsFill,
  PiClockFill,
  PiChatCircleDotsFill,
  PiPhoneFill,
  PiVideoCameraFill,
  PiCheckCircleFill,
  PiHourglassFill,
  PiSparkleFill,
  PiShieldCheckFill,
  PiShareFatFill,
  PiFlameFill,
  PiTrophyFill,
  PiCheckBold,
  PiPercentFill,
  PiBroadcastFill,
  PiHeadsetBold,
  PiArrowRightBold,
} from 'react-icons/pi';
import { agencyApi, chatApi, callApi, type AgencyItem } from '../api';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';
import { getMediaUrl } from '../lib/media';

export const AgencyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [agency, setAgency] = useState<AgencyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Call state
  const [call, setCall] = useState<{
    outgoing?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      token: string;
      callee?: { nickname: string; avatar?: string } | null;
    };
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await agencyApi.getAgencyDetails(id);
      if (res.data?.success && res.data.data) {
        setAgency(res.data.data);
      } else {
        setAgency(null);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Agency not found', 'error');
      setAgency(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast(`Agency code ${code} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleShareAgency = async () => {
    if (!agency) return;
    const shareUrl = window.location.href;
    const shareData = {
      title: `${agency.name} | Navo Live Agency`,
      text: `Join ${agency.name} on Navo Live using Agency Code: ${agency.code}!`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Agency link copied to clipboard!', 'success');
      } catch {
        handleCopyCode(agency.code);
      }
    }
  };

  const handleJoinDirect = async () => {
    if (!agency) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agencyApi.joinAgency(agency._id);
      if (res.data?.success) {
        showToast(`Successfully joined ${agency.name}!`, 'success');
        loadDetails();
      } else {
        showToast(res.data?.error || 'Could not join agency', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to join agency', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!agency) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agencyApi.requestJoin(agency._id, joinMessage.trim() || undefined);
      if (res.data?.success) {
        showToast('Join request submitted to agency owner!', 'success');
        setShowJoinModal(false);
        setJoinMessage('');
        loadDetails();
      } else {
        showToast(res.data?.error || 'Could not submit join request', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit join request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async () => {
    const agentId = agency?.agent?._id;
    if (!agentId) return;
    try {
      const { data } = await chatApi.getOrCreateChat(agentId);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${agentId}`);
      }
    } catch {
      navigate(`/user/${agentId}`);
    }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    const agentId = agency?.agent?._id;
    if (!agentId) return;

    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Permission denied', 'error');
      return;
    }

    try {
      const { data } = await callApi.create([agentId], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: agency.agent.nickname, avatar: agency.agent.avatar },
          },
        });
      }
    } catch {
      showToast('Could not start call with agent', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loading size="lg" />
        <p className="text-xs font-bold text-slate-400 mt-3 animate-pulse">Loading Agency Details...</p>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-18 h-18 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-3xl mb-4 shadow-sm">
          🏢
        </div>
        <h2 className="text-lg font-black text-slate-900">Agency Not Found</h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1.5 mb-6 leading-relaxed">
          The requested agency may have been removed, changed code, or does not exist.
        </p>
        <button
          onClick={() => navigate('/agency')}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <PiCaretLeftBold className="w-4 h-4" />
          <span>Explore All Agencies</span>
        </button>
      </div>
    );
  }

  const relationship = agency.userRelationship || {
    isOwner: user?._id === agency.agent._id,
    isMember: user?.agencyId === agency._id,
    hasPendingJoinRequest: false,
    hasPendingLeaveRequest: false,
  };

  const isPrivate = agency.type === 'private';
  const members = agency.members || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans antialiased select-none text-slate-900">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="flex items-center justify-between px-3.5 h-14 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <PiCaretLeftBold className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 min-w-0 max-w-[210px]">
            <span className="font-extrabold text-sm text-slate-900 truncate">
              {agency.name}
            </span>
            <PiShieldCheckFill className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>

          <button
            onClick={handleShareAgency}
            aria-label="Share Agency"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 active:scale-90 transition-all"
          >
            <PiShareFatFill className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3.5 pt-3.5 space-y-3.5">
        {/* ── Agency Hero Card ── */}
        <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
          {/* Cover Banner */}
          <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700">
            {agency.cover ? (
              <img
                src={getMediaUrl(agency.cover)}
                alt="Agency Cover"
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full relative overflow-hidden opacity-90">
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/10 blur-xl" />
                <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-indigo-400/20 blur-xl" />
                <div className="absolute inset-0 flex items-center justify-center text-white/20 font-black text-6xl tracking-widest uppercase pointer-events-none select-none">
                  {agency.name.slice(0, 4)}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            
            {/* Top right type badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold backdrop-blur-md shadow-xs border flex items-center gap-1 ${
                  isPrivate
                    ? 'bg-purple-900/80 text-purple-200 border-purple-400/30'
                    : 'bg-emerald-900/80 text-emerald-200 border-emerald-400/30'
                }`}
              >
                {isPrivate ? (
                  <>
                    <PiLockKeyFill className="w-3 h-3" />
                    <span>Private</span>
                  </>
                ) : (
                  <>
                    <PiGlobeFill className="w-3 h-3" />
                    <span>Public</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Profile Header & Info */}
          <div className="px-4 pb-4 pt-0 relative">
            <div className="flex items-end justify-between -mt-10 mb-3">
              <div className="relative">
                {agency.avatar ? (
                  <img
                    src={getMediaUrl(agency.avatar)}
                    alt={agency.name}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center text-white font-black text-2xl shadow-md ring-4 ring-white">
                    {agency.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black border-2 border-white flex items-center gap-0.5 shadow-sm">
                  <PiCrownFill className="w-3 h-3 text-amber-400" />
                  <span>Lv.{agency.level}</span>
                </div>
              </div>

              {/* Code Pill with One-Tap Copy */}
              <button
                onClick={() => handleCopyCode(agency.code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 active:scale-95 border border-indigo-200/80 text-xs font-mono font-bold text-indigo-700 transition-all shadow-xs"
              >
                <span>Code: <strong>{agency.code}</strong></span>
                {copiedCode ? (
                  <PiCheckBold className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50" />
                ) : (
                  <PiCopyFill className="w-3.5 h-3.5 text-indigo-500" />
                )}
              </button>
            </div>

            {/* Name and description */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">
                  {agency.name}
                </h1>
                <PiShieldCheckFill className="w-5 h-5 text-indigo-600 shrink-0" title="Verified Agency" />
              </div>

              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                {agency.description || 'Welcome to our agency! We support live streamers with traffic growth, technical assistance, and exclusive reward incentives.'}
              </p>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-4 pt-3.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <PiCrownFill className="w-3.5 h-3.5 text-amber-500" />
                  <span>Level {agency.level}</span>
                  <span className="text-slate-400 font-normal">→ Level {agency.level + 1}</span>
                </span>
                <span className="text-indigo-600 font-extrabold">{agency.levelProgress || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-full transition-all duration-700 shadow-xs"
                  style={{ width: `${Math.max(4, Math.min(100, agency.levelProgress || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Performance Stats Grid ── */}
        <section className="grid grid-cols-2 gap-2.5">
          {/* Members */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Members
              </span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0">
                <PiUsersFill className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {agency.memberCount}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Active hosts
              </p>
            </div>
          </div>

          {/* Contribution */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Contribution
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
                <PiCoinsFill className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-amber-600 tracking-tight leading-none break-all" title={`${(agency.totalContribution || 0).toLocaleString()} points`}>
                {(agency.totalContribution || 0) >= 100_000_000
                  ? `${((agency.totalContribution || 0) / 1_000_000).toFixed(1)}M`
                  : (agency.totalContribution || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Total points
              </p>
            </div>
          </div>

          {/* Live Time */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Live Hours
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
                <PiClockFill className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {agency.totalLiveHours || 0}h
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Stream time
              </p>
            </div>
          </div>

          {/* Commission */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                Commission
              </span>
              <div className="w-7 h-7 rounded-xl bg-purple-50 border border-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
                <PiPercentFill className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-purple-700 tracking-tight leading-none">
                {agency.commission ?? 10}%
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Host benefit share
              </p>
            </div>
          </div>
        </section>

        {/* ── Agency Owner / Leader Profile Card ── */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5">
              <PiCrownFill className="w-4 h-4 text-amber-500" />
              <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Agency Leader & Agent
              </h2>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Verified Leader
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <Avatar
                src={agency.agent.avatar}
                nickname={agency.agent.nickname}
                size="lg"
                className="ring-2 ring-indigo-200 shadow-xs"
              />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-[9px] font-black text-amber-300 border border-white">
                Lv.{agency.agent.level || 1}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-slate-900 truncate">
                  {agency.agent.nickname}
                </h3>
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-500 font-medium">
                <span className="font-mono text-indigo-600 font-bold">ID: {agency.agent.uid}</span>
                {agency.agent.country && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span>{agency.agent.country}</span>
                  </>
                )}
              </div>
              {agency.agent.bio && (
                <p className="text-[11px] text-slate-500 truncate mt-1">
                  {agency.agent.bio}
                </p>
              )}
            </div>
          </div>

          {/* Quick Contact Action Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-slate-100">
            <button
              onClick={handleOpenChat}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold transition-all"
            >
              <PiChatCircleDotsFill className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Message</span>
            </button>

            <button
              onClick={() => handleStartCall('audio')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 text-xs font-bold transition-all border border-emerald-100"
            >
              <PiPhoneFill className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Voice</span>
            </button>

            <button
              onClick={() => handleStartCall('video')}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-xs font-bold transition-all border border-indigo-100"
            >
              <PiVideoCameraFill className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Video</span>
            </button>
          </div>
        </section>

        {/* ── Agency Benefits Card ── */}
        <section className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-3xl p-4 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <PiSparkleFill className="w-4 h-4 text-amber-300" />
              <h2 className="font-extrabold text-xs text-indigo-200 uppercase tracking-wider">
                Member Privileges & Growth
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
              Host Perks
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <PiBroadcastFill className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">Traffic Boost</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-tight">Priority recommendation on live stream lists.</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <PiTrophyFill className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Official Events</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-tight">Access to agency PK battles and special gift rewards.</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <PiHeadsetBold className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold">1-on-1 Coaching</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-tight">Dedicated guidance from the agency leader.</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <PiCoinsFill className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold">Monthly Bonuses</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-tight">Extra incentive payouts for active streaming hosts.</p>
            </div>
          </div>
        </section>

        {/* ── Member Leaderboard & Roster ── */}
        <section className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5">
              <PiFlameFill className="w-4 h-4 text-orange-500" />
              <h2 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Agency Hosts ({members.length})
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Live Hours & Earnings</span>
          </div>

          {members.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl mb-2">
                👥
              </div>
              <p className="text-xs font-bold text-slate-700">No members yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Be the first host to join and lead the leaderboard!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member, idx) => {
                const rankColor =
                  idx === 0
                    ? 'text-amber-500 bg-amber-50 border-amber-200'
                    : idx === 1
                    ? 'text-slate-500 bg-slate-100 border-slate-300'
                    : idx === 2
                    ? 'text-amber-700 bg-orange-50 border-orange-200'
                    : 'text-slate-400 bg-slate-50 border-slate-200';

                return (
                  <div
                    key={member._id}
                    onClick={() => navigate(`/user/${member._id}`)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 active:scale-[0.99] border border-slate-100 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border ${rankColor}`}
                      >
                        {idx + 1}
                      </div>

                      <Avatar
                        src={member.avatar}
                        nickname={member.nickname}
                        size="sm"
                        className="ring-1 ring-slate-200 shadow-xs"
                      />

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                          <span>{member.nickname}</span>
                          <span className="text-[9px] font-extrabold px-1 rounded-sm bg-indigo-50 text-indigo-600">
                            Lv.{member.level || 1}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          ID: {member.uid}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs font-black text-amber-600 tabular-nums">
                        {(member.contribution || 0).toLocaleString()} <span className="text-[10px] font-medium text-amber-500">coins</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {member.liveHours || 0}h live
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Bottom Fixed Action Bar ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 shadow-xl">
        <div className="max-w-md mx-auto">
          {relationship.isOwner ? (
            <button
              onClick={() => navigate('/agent')}
              className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-[0.98] text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PiCrownFill className="w-4 h-4 text-amber-400" />
              <span>Agency Owner Dashboard & Management</span>
              <PiArrowRightBold className="w-3.5 h-3.5 ml-1" />
            </button>
          ) : relationship.isMember ? (
            <button
              onClick={() => navigate('/my-agency')}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PiCheckCircleFill className="w-4 h-4 text-emerald-300" />
              <span>You are a Member • Open My Agency Hub</span>
              <PiArrowRightBold className="w-3.5 h-3.5 ml-1" />
            </button>
          ) : relationship.hasPendingJoinRequest ? (
            <div className="w-full h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs">
              <PiHourglassFill className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Join Request Pending Owner Approval</span>
            </div>
          ) : !user ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Login to Join This Agency</span>
              <PiArrowRightBold className="w-3.5 h-3.5" />
            </button>
          ) : isPrivate ? (
            <button
              onClick={() => setShowJoinModal(true)}
              disabled={actionLoading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PiLockKeyFill className="w-4 h-4" />
              <span>Request to Join Agency</span>
            </button>
          ) : (
            <button
              onClick={handleJoinDirect}
              disabled={actionLoading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <PiGlobeFill className="w-4 h-4" />
              <span>{actionLoading ? 'Joining Agency...' : 'Join Agency Directly'}</span>
            </button>
          )}
        </div>
      </footer>

      {/* ── Join Request Modal for Private Agency ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center text-2xl mb-2.5 shadow-xs border border-purple-100">
                <PiLockKeyFill className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Join Private Agency
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Send an introduction message to <strong>{agency.name}</strong>.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Introductory Note (Optional)
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Tell the agency owner about your streaming experience, schedule, or goals..."
                rows={3}
                maxLength={200}
                className="w-full text-xs p-3 rounded-2xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-purple-500 focus:outline-none transition-all resize-none font-medium text-slate-800 placeholder:text-slate-400"
              />
              <div className="text-right text-[10px] text-slate-400 mt-1">
                {joinMessage.length}/200
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestJoin}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
              >
                {actionLoading ? 'Sending...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Screen Modal */}
      {call && (
        <CallScreen
          outgoing={call.outgoing}
          accepted={callAccepted}
          onClose={() => {
            setCall(null);
            setCallAccepted(false);
          }}
        />
      )}
    </div>
  );
};

