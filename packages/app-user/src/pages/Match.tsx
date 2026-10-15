import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiVideoCameraFill as Video,
  PiMicrophoneFill as Mic,
  PiPhoneCallFill as PhoneCall,
  PiXBold as X,
  PiCaretLeftBold as ArrowLeft,
  PiLightningFill as Zap,
  PiGenderMaleBold as MaleIcon,
  PiGenderFemaleBold as FemaleIcon,
  PiUsersBold as AllGendersIcon,
  PiShieldCheckFill as ShieldCheck,
  PiSparkleFill as Sparkles,
  PiCompassFill as Compass,
  PiPlanetFill as Planet,
  PiCrownFill as Crown,
} from 'react-icons/pi';
import { useSocketStore, useAuthStore } from '../stores';
import { callApi } from '../api';
import { CallScreen } from '../components/call';
import { Avatar } from '../components/user';
import { requestMediaPermissions } from '../lib/permissions';

type Phase = 'idle' | 'searching' | 'calling';
type CallType = 'audio' | 'video';
export type GenderFilter = 'male' | 'female' | 'all';

interface MatchInvite {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  initiatorId: string;
  token: string;
  initiator: { nickname: string; avatar?: string } | null;
}

// Simulated radar blip targets in radar coordinates with varying timing & positions
const RADAR_BLIPS = [
  { id: 1, top: '22%', left: '28%', delay: 0.4, color: 'bg-emerald-400', shadow: 'rgba(52,211,153,0.9)' },
  { id: 2, top: '68%', left: '74%', delay: 1.2, color: 'bg-pink-400', shadow: 'rgba(244,114,182,0.9)' },
  { id: 3, top: '32%', left: '78%', delay: 1.9, color: 'bg-cyan-400', shadow: 'rgba(34,211,238,0.9)' },
  { id: 4, top: '76%', left: '26%', delay: 2.6, color: 'bg-purple-400', shadow: 'rgba(192,132,252,0.9)' },
  { id: 5, top: '18%', left: '60%', delay: 3.1, color: 'bg-amber-400', shadow: 'rgba(251,191,36,0.9)' },
];

const SEARCHING_TICKERS = [
  'Calibrating matchmaking radar...',
  'Scanning active online users...',
  'Finding best matching personality...',
  'Establishing secure low-latency link...',
];

/**
 * Random 1:1 match — gender filter (Boy / Girl / All), call type toggle,
 * luxury radar-style scanning animation, and instant call launch on match.
 */
export const Match = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const joinMatch = useSocketStore((s) => s.joinMatch);
  const leaveMatch = useSocketStore((s) => s.leaveMatch);
  const currentUser = useAuthStore((s) => s.user);

  const [phase, setPhase] = useState<Phase>('idle');
  const [callType, setCallType] = useState<CallType>('video');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [invite, setInvite] = useState<MatchInvite | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [error, setError] = useState('');
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [showSubModal, setShowSubModal] = useState(false);
  const activeCallRef = useRef<string>('');

  const matchSub = currentUser?.matchSubscription;
  const isSubActive = Boolean(
    matchSub?.active &&
    matchSub?.expiresAt &&
    new Date(matchSub.expiresAt) > new Date()
  );
  const filterMatchesRemaining = matchSub?.filterMatchesRemaining ?? 0;
  const freeCallsRemaining = matchSub?.freeCallsRemaining ?? 0;
  const hasFilterQuota = isSubActive && filterMatchesRemaining > 0;

  const handleGenderSelect = (gender: GenderFilter) => {
    if (gender !== 'all' && !hasFilterQuota) {
      setShowSubModal(true);
      return;
    }
    setGenderFilter(gender);
  };

  // Search timer & rotating dynamic ticker
  useEffect(() => {
    let t: any;
    let tickerTimer: any;
    if (phase === 'searching') {
      setSearchElapsed(0);
      setTickerIndex(0);
      t = setInterval(() => setSearchElapsed((s) => s + 1), 1000);
      tickerTimer = setInterval(() => {
        setTickerIndex((idx) => (idx + 1) % SEARCHING_TICKERS.length);
      }, 2500);
    }
    return () => {
      clearInterval(t);
      clearInterval(tickerTimer);
    };
  }, [phase]);

  const startSearching = useCallback(async () => {
    setError('');

    if (genderFilter !== 'all' && !hasFilterQuota) {
      setShowSubModal(true);
      return;
    }

    // Pre-flight check media permissions
    const perm = await requestMediaPermissions(callType);
    if (!perm.granted) {
      setError(perm.error || 'Camera/Microphone permissions required for call');
      return;
    }

    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('searching');
    joinMatch(callType, genderFilter, (res: any) => {
      if (res && !res.success) {
        setPhase('idle');
        if (res.needSubscription) {
          setShowSubModal(true);
        } else {
          setError(res.error || 'Failed to join match queue');
        }
      }
    });
  }, [joinMatch, callType, genderFilter, hasFilterQuota]);

  const stopAndLeave = useCallback(() => {
    leaveMatch();
    setPhase('idle');
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    navigate('/');
  }, [leaveMatch, navigate]);

  const cancelSearch = useCallback(() => {
    leaveMatch();
    setPhase('idle');
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
  }, [leaveMatch]);

  // Leave queue on unmount
  useEffect(() => {
    return () => {
      leaveMatch();
    };
  }, [leaveMatch]);

  // Incoming match event → instantly open and join call
  useEffect(() => {
    if (!socket) return;

    const handleMatch = (payload: any) => {
      if (phase !== 'searching') return;
      if (!payload?.callId || !payload?.channel || !payload?.token) return;

      // Dequeue from matchmaking pool immediately
      leaveMatch();

      const peerInfo = payload.peer || payload.callee || payload.initiator || { nickname: 'User' };

      setInvite({
        callId: payload.callId,
        channel: payload.channel,
        type: payload.type === 'video' ? 'video' : 'audio',
        initiatorId: payload.initiatorId,
        token: payload.token,
        initiator: peerInfo,
      });
      activeCallRef.current = payload.callId;
      setCallAccepted(true);
      setPhase('calling');
    };

    socket.on('call:matched', handleMatch);
    socket.on('call:invite', handleMatch);

    return () => {
      socket.off('call:matched', handleMatch);
      socket.off('call:invite', handleMatch);
    };
  }, [socket, phase, leaveMatch]);

  // Call ended or closed → cleanly reset state and return to idle setup screen
  const handleCallClose = useCallback((_outcome?: 'ended' | 'rejected') => {
    leaveMatch();
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('idle');
  }, [leaveMatch]);

  // Next — end current call and immediately re-enter queue
  const handleNext = useCallback(async () => {
    const callId = activeCallRef.current;
    if (callId) await callApi.end(callId, 'ended').catch(() => {});
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('searching');
    joinMatch(callType, genderFilter);
  }, [joinMatch, callType, genderFilter]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const genderLabel =
    genderFilter === 'male' ? 'Boy' : genderFilter === 'female' ? 'Girl' : 'All';

  return (
    <div className="min-h-screen bg-[#07070d] text-white flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden select-none">
      {/* ── Ambient Background Lighting ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(168,85,247,0.25),rgba(236,72,153,0.12),rgba(0,0,0,0.95))]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Subtle grid pattern background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* ── Top Navigation Bar ── */}
      {phase !== 'calling' && (
        <header className="absolute top-4 inset-x-4 max-w-md mx-auto z-20 flex items-center justify-between">
          <button
            onClick={stopAndLeave}
            aria-label="Back to Home"
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 backdrop-blur-xl active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
          >
            <ArrowLeft className="w-5 h-5 text-white/90" />
          </button>

          {/* Live Online Badge */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/15 shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold tracking-wide text-white/80">
              14,800+ Online
            </span>
          </div>
        </header>
      )}

      {/* ── 1. IDLE SETUP SCREEN (ULTRA-PREMIUM ENTRY) ── */}
      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-sm flex flex-col space-y-6 pt-12 pb-6"
        >
          {/* Hero Visual Holographic Showcase */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5 flex items-center justify-center">
              {/* Outer decorative breathing glow rings */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 180, 270, 360] }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                className="absolute w-28 h-28 rounded-full border border-dashed border-purple-500/40 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1.1, 0.95, 1.1], rotate: [360, 270, 180, 90, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                className="absolute w-32 h-32 rounded-full border border-dashed border-pink-500/30 pointer-events-none"
              />
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 blur-xl opacity-60 animate-pulse pointer-events-none" />

              {/* Center Holographic Icon Card */}
              <motion.div
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#1b1035] via-[#2d124d] to-[#3b1248] p-0.5 shadow-[0_12px_40px_rgba(168,85,247,0.45)] border border-white/20 flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.4),transparent_70%)]" />
                <div className="w-full h-full rounded-[22px] flex items-center justify-center bg-black/30 backdrop-blur-sm relative">
                  <Zap className="w-11 h-11 text-transparent bg-gradient-to-tr from-amber-300 via-pink-400 to-purple-300 bg-clip-text drop-shadow-[0_4px_12px_rgba(244,114,182,0.8)]" />
                  <Sparkles className="absolute top-2 right-2 w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              </motion.div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-[11px] font-bold text-pink-300 mb-1">
                <Sparkles className="w-3 h-3 text-pink-400" />
                <span>Instant 1:1 Live Matching</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                Random Match
              </h1>
              <p className="text-xs text-white/60 font-medium max-w-[280px] mx-auto leading-relaxed">
                Connect face-to-face or voice with real people nearby & around the world.
              </p>
            </div>
          </div>

          {/* 1:1 VIP Subscription Status / Upsell Banner */}
          {isSubActive ? (
            <div className="w-full rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-pink-500/15 border border-amber-400/40 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-pink-500 flex items-center justify-center text-white shadow-md shrink-0">
                  <Crown className="w-5 h-5 text-amber-100" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-amber-300">1:1 VIP Active</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-bold">1 Week</span>
                  </div>
                  <p className="text-[11px] text-white/70 font-medium">
                    <span className="text-white font-bold">{filterMatchesRemaining}</span> filter matches · <span className="text-white font-bold">{freeCallsRemaining}</span> free calls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/store?category=subscription')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-all shrink-0"
              >
                Store
              </button>
            </div>
          ) : (
            <div
              onClick={() => navigate('/store?category=subscription')}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-amber-900/40 border border-purple-400/30 hover:border-pink-400/50 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-lg cursor-pointer group transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-pink-300">1:1 VIP Pass</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">Store</span>
                  </div>
                  <p className="text-[11px] text-white/60 font-medium">
                    100 gender filters & 5 free 1m calls/week
                  </p>
                </div>
              </div>
              <div className="flex items-center text-xs font-bold text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0">
                Get ➔
              </div>
            </div>
          )}

          {/* 1. Gender Filter Card (Boy / Girl / All) */}
          <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl p-4 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                  I Want to Meet
                </span>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/10 text-pink-300 border border-white/10">
                {genderLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* BOY FILTER */}
              <button
                type="button"
                onClick={() => handleGenderSelect('male')}
                className={`relative flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl font-bold transition-all border ${
                  genderFilter === 'male'
                    ? 'bg-gradient-to-b from-blue-600/90 to-indigo-700/90 text-white border-blue-400/80 shadow-[0_0_24px_rgba(59,130,246,0.55)] scale-[1.03]'
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {!hasFilterQuota && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/90 text-[8px] font-black text-slate-950 shadow">
                    <Crown className="w-2.5 h-2.5" />
                    <span>VIP</span>
                  </span>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all ${
                    genderFilter === 'male'
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-blue-500/10 text-blue-400'
                  }`}
                >
                  <MaleIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold tracking-wide">Boy</span>
                <span className="text-[9px] text-white/50 font-medium mt-0.5">Male only</span>
              </button>

              {/* GIRL FILTER */}
              <button
                type="button"
                onClick={() => handleGenderSelect('female')}
                className={`relative flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl font-bold transition-all border ${
                  genderFilter === 'female'
                    ? 'bg-gradient-to-b from-pink-600/90 to-rose-700/90 text-white border-pink-400/80 shadow-[0_0_24px_rgba(244,63,94,0.55)] scale-[1.03]'
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {!hasFilterQuota && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/90 text-[8px] font-black text-slate-950 shadow">
                    <Crown className="w-2.5 h-2.5" />
                    <span>VIP</span>
                  </span>
                )}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all ${
                    genderFilter === 'female'
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-pink-500/10 text-pink-400'
                  }`}
                >
                  <FemaleIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold tracking-wide">Girl</span>
                <span className="text-[9px] text-white/50 font-medium mt-0.5">Female only</span>
              </button>

              {/* ALL GENDERS FILTER */}
              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`relative flex flex-col items-center justify-center py-3.5 px-2 rounded-2xl font-bold transition-all border ${
                  genderFilter === 'all'
                    ? 'bg-gradient-to-b from-purple-600/90 via-fuchsia-600/90 to-pink-600/90 text-white border-purple-400/80 shadow-[0_0_24px_rgba(168,85,247,0.55)] scale-[1.03]'
                    : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-all ${
                    genderFilter === 'all'
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  <AllGendersIcon className="w-5 h-5" />
                </div>
                <span className="text-xs font-extrabold tracking-wide">All</span>
                <span className="text-[9px] text-emerald-400 font-bold mt-0.5">Everyone</span>
              </button>
            </div>
          </div>

          {/* 2. Call Mode Selector (Video Call vs Voice Call) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCallType('video')}
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                callType === 'video'
                  ? 'bg-gradient-to-r from-purple-950/60 to-pink-950/60 border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] opacity-75'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  callType === 'video'
                    ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                <Video className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white">Video Call</p>
                <p className="text-[10px] text-white/50 font-medium truncate">Face to face</p>
              </div>
              {callType === 'video' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,1)]" />
              )}
            </button>

            <button
              onClick={() => setCallType('audio')}
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                callType === 'audio'
                  ? 'bg-gradient-to-r from-purple-950/60 to-pink-950/60 border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                  : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] opacity-75'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  callType === 'audio'
                    ? 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white">Voice Call</p>
                <p className="text-[10px] text-white/50 font-medium truncate">Audio only</p>
              </div>
              {callType === 'audio' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,1)]" />
              )}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-rose-300 bg-rose-950/70 border border-rose-500/40 rounded-2xl py-2.5 px-3.5 flex items-center gap-2 backdrop-blur-md"
            >
              <span>⚠️</span>
              <span className="flex-1 font-medium">{error}</span>
            </motion.div>
          )}

          {/* 3. Main Start Random Match CTA Button */}
          <div className="space-y-3 pt-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={startSearching}
              className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-extrabold text-base shadow-[0_10px_35px_rgba(192,38,211,0.5)] border border-white/30 flex items-center justify-center gap-3 overflow-hidden group"
            >
              {/* Shimmer sweep overlay */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12 group-hover:animate-pulse pointer-events-none" />
              <PhoneCall className="w-5 h-5 text-white drop-shadow" />
              <span className="tracking-wide">Start Random Match</span>
            </motion.button>

            {/* Trust and safety badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Private & Verified · Instant Connection</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 2. RADAR-STYLE SEARCHING ANIMATION (PREMIUM SCI-FI / LUXURY) ── */}
      <AnimatePresence>
        {phase === 'searching' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-sm text-center flex flex-col items-center justify-center space-y-7 py-6"
          >
            {/* RADAR CONTAINER */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
              {/* Radar Outer Glow Rim & Atmosphere */}
              <div className="absolute inset-0 rounded-full border border-purple-500/40 bg-gradient-to-b from-purple-500/10 via-pink-500/5 to-transparent backdrop-blur-md shadow-[0_0_60px_rgba(168,85,247,0.3)]" />

              {/* Concentric Radar Distance Rings */}
              <div className="absolute inset-8 rounded-full border border-purple-500/30 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-dashed border-purple-400/25 pointer-events-none" />
              <div className="absolute inset-24 rounded-full border border-purple-500/20 pointer-events-none" />
              <div className="absolute inset-32 rounded-full border border-purple-500/15 pointer-events-none" />

              {/* Holographic Coordinate Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-purple-400/40 to-transparent pointer-events-none" />

              {/* Corner coordinate reticle marks */}
              <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-purple-400/60 pointer-events-none" />
              <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-purple-400/60 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-purple-400/60 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-purple-400/60 pointer-events-none" />

              {/* Expanding Pulsing Sonar Waves (3 staggered layers) */}
              <motion.div
                animate={{ scale: [0.3, 1.3], opacity: [0.85, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-purple-400 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [0.3, 1.3], opacity: [0.85, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-pink-400 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [0.3, 1.3], opacity: [0.85, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: 1.6, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-amber-400 pointer-events-none"
              />

              {/* 360-Degree Rotating Radar Scanner Beam */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
              >
                <div
                  className="w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    background:
                      'conic-gradient(from 0deg at 100% 100%, rgba(217, 70, 239, 0.5) 0deg, rgba(168, 85, 247, 0.25) 30deg, rgba(236, 72, 153, 0.08) 60deg, transparent 90deg)',
                  }}
                />
              </motion.div>

              {/* Simulated Radar Blip Targets with Ping Rings */}
              {RADAR_BLIPS.map((blip) => (
                <div
                  key={blip.id}
                  style={{ top: blip.top, left: blip.left }}
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: blip.delay }}
                    style={{ boxShadow: `0 0 14px ${blip.shadow}` }}
                    className={`w-3.5 h-3.5 rounded-full ${blip.color} relative flex items-center justify-center`}
                  >
                    <span className="w-1 h-1 rounded-full bg-white" />
                  </motion.div>
                </div>
              ))}

              {/* Center User Avatar & Holographic Beacon */}
              <div className="relative z-10 w-24 h-24 rounded-full bg-neutral-950/90 border-2 border-purple-400/80 p-1.5 shadow-[0_0_35px_rgba(168,85,247,0.6)] flex items-center justify-center">
                <Avatar
                  src={currentUser?.avatar}
                  nickname={currentUser?.nickname || 'Me'}
                  size="md"
                  className="w-full h-full rounded-full"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black animate-ping" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
            </div>

            {/* Radar Status & Details */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
                  Searching for a Match...
                </h2>
              </div>

              {/* Dynamic Ticker */}
              <p className="text-xs text-pink-300 font-semibold h-4 tracking-wide transition-all">
                {SEARCHING_TICKERS[tickerIndex]}
              </p>

              {/* Preference & Call Type Pill */}
              <div className="flex items-center justify-center gap-2 text-xs text-white/70">
                <span className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/10 font-bold text-white/90">
                  Target: <span className="text-pink-300">{genderLabel}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/10 font-bold text-white/90">
                  Mode: <span className="text-purple-300">{callType === 'video' ? 'Video' : 'Voice'}</span>
                </span>
              </div>

              {/* Elapsed Time Counter */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-xs text-purple-300 font-mono tracking-wider font-bold shadow-inner">
                <Planet className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Elapsed: {fmtTime(searchElapsed)}</span>
              </div>
            </div>

            {/* Cancel / Stop Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={cancelSearch}
              className="w-full py-3.5 rounded-2xl bg-white/[0.08] hover:bg-rose-600/80 text-white font-bold text-sm border border-white/15 hover:border-rose-400/50 backdrop-blur-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>Cancel Search</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. ACTIVE ONE-TO-ONE CALL ── */}
      {phase === 'calling' && invite && (
        <CallScreen
          incoming={{
            callId: invite.callId,
            channel: invite.channel,
            type: invite.type,
            initiatorId: invite.initiatorId,
            token: invite.token,
            initiator: invite.initiator,
          }}
          accepted={callAccepted}
          onNext={handleNext}
          onClose={handleCallClose}
        />
      )}

      {/* ── 4. 1:1 SUBSCRIPTION REQUIRED MODAL ── */}
      <AnimatePresence>
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm rounded-3xl bg-[#120e24] border border-purple-500/40 p-6 text-center shadow-[0_20px_60px_rgba(168,85,247,0.4)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5 shadow-xl flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-[#120e24] flex items-center justify-center">
                  <Crown className="w-8 h-8 text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]" />
                </div>
              </div>

              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 border border-amber-400/40 text-[11px] font-black text-amber-300 uppercase tracking-wider mb-2">
                1:1 Subscription VIP
              </span>

              <h3 className="text-xl font-black text-white tracking-tight mb-2">
                Gender Filter Requires Pass
              </h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                To filter matchmaking specifically by <span className="text-pink-300 font-bold">Boy</span> or <span className="text-pink-300 font-bold">Girl</span>, you need the <span className="text-amber-300 font-bold">1:1 Subscription Card</span> from the Store.
              </p>

              {/* Benefits list */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2 mb-5 text-left text-xs">
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>100 Filter Matches</strong> per week</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>5 Free Calls</strong> (1st full minute free)</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Active for <strong>7 days (1 Week)</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubModal(false);
                    navigate('/store?category=subscription');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4 text-amber-200" />
                  <span>Get 1:1 Pass in Store</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGenderFilter('all');
                    setShowSubModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition-all"
                >
                  Match Everyone for Free
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
