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
} from 'react-icons/pi';
import { useSocketStore, useAuthStore } from '../stores';
import { callApi } from '../api';
import { CallScreen } from '../components/call';
import { Avatar } from '../components/user';

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

// Simulated radar blip targets in radar coordinates
const RADAR_BLIPS = [
  { id: 1, top: '22%', left: '30%', delay: 0.6 },
  { id: 2, top: '68%', left: '72%', delay: 1.4 },
  { id: 3, top: '35%', left: '78%', delay: 2.1 },
  { id: 4, top: '75%', left: '26%', delay: 2.8 },
];

/**
 * Random 1:1 match — gender filter (Boy / Girl / All), call type toggle,
 * radar-style scanning animation, and instant call launch on match.
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
  const activeCallRef = useRef<string>('');

  // Search timer
  useEffect(() => {
    let t: any;
    if (phase === 'searching') {
      setSearchElapsed(0);
      t = setInterval(() => setSearchElapsed((s) => s + 1), 1000);
    }
    return () => clearInterval(t);
  }, [phase]);

  const startSearching = useCallback(() => {
    setError('');
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('searching');
    joinMatch(callType, genderFilter);
  }, [joinMatch, callType, genderFilter]);

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

  // Leave the queue on unmount so we never ghost-wait.
  useEffect(() => {
    return () => {
      leaveMatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Incoming match invite → accept and open the call.
  useEffect(() => {
    if (!socket) return;
    const onInvite = async (payload: any) => {
      // Only handle invites while we're actually searching for a match.
      if (phase !== 'searching') return;
      if (!payload?.callId || !payload?.channel || !payload?.token) return;
      if (payload.initiatorId && payload.initiatorId === activeCallRef.current) return;

      setInvite({
        callId: payload.callId,
        channel: payload.channel,
        type: payload.type === 'video' ? 'video' : 'audio',
        initiatorId: payload.initiatorId,
        token: payload.token,
        initiator: payload.initiator || null,
      });
      activeCallRef.current = payload.callId;

      // Accept on the caller's behalf (no ringing screen — random match is auto-accept).
      try {
        const { data } = await callApi.accept(payload.callId);
        if (data.success && data.data) {
          setCallAccepted(true);
          setInvite((prev) => prev && {
            ...prev,
            channel: data.data.channel,
            token: data.data.token,
            type: data.data.type,
          });
        }
      } catch {
        // Fall back to the invite payload — join with the invite token.
        setCallAccepted(true);
      }
      setPhase('calling');
    };
    socket.on('call:invite', onInvite);
    return () => {
      socket.off('call:invite', onInvite);
    };
  }, [socket, phase]);

  // Call ended by the peer → return to searching (auto re-match).
  const handleCallClose = useCallback((outcome?: 'ended' | 'rejected') => {
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    if (outcome === 'rejected' || outcome === 'ended') {
      // Peer left — go back to searching for the next stranger.
      setPhase('searching');
      joinMatch(callType, genderFilter);
    } else {
      setPhase('idle');
    }
  }, [joinMatch, callType, genderFilter]);

  // Next — end the current call and immediately re-enter the queue.
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
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/20 via-black to-brand-secondary/15 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-brand-secondary/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      {phase !== 'calling' && (
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={stopAndLeave}
            aria-label="Back to Home"
            className="glass-chip w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 active:scale-95 transition-all shadow-md"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* ── IDLE SETUP SCREEN ── */}
      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 w-full max-w-sm space-y-7 text-center"
        >
          <div>
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
              transition={{ duration: 3.2, repeat: Infinity }}
              className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-brand-primary via-purple-500 to-brand-secondary flex items-center justify-center shadow-glow mb-4 border border-white/20"
            >
              <Zap className="w-12 h-12 text-white drop-shadow-md" />
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              Random Match
            </h1>
            <p className="text-dark-300 text-sm mt-1.5">
              Meet new friends instantly with 1:1 live video or voice.
            </p>
          </div>

          {/* 1. Gender Filter Selector (Boy / Girl / All) */}
          <div className="bg-dark-900/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">
                Matching Preference
              </span>
              <span className="text-[11px] font-semibold text-brand-secondary">{genderLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGenderFilter('male')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  genderFilter === 'male'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] scale-102'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <MaleIcon className="w-4 h-4 text-blue-400" />
                Boy
              </button>

              <button
                type="button"
                onClick={() => setGenderFilter('female')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  genderFilter === 'female'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] scale-102'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <FemaleIcon className="w-4 h-4 text-pink-400" />
                Girl
              </button>

              <button
                type="button"
                onClick={() => setGenderFilter('all')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  genderFilter === 'all'
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-transparent shadow-glow-sm scale-102'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                <AllGendersIcon className="w-4 h-4 text-purple-400" />
                All
              </button>
            </div>
          </div>

          {/* 2. Call Type Selector (Video / Audio) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setCallType('video')}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${
                callType === 'video'
                  ? 'border-brand-primary bg-brand-primary/20 text-white shadow-glow-sm font-bold'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Video className="w-5 h-5 text-brand-primary" /> Video Call
            </button>
            <button
              onClick={() => setCallType('audio')}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border transition-all ${
                callType === 'audio'
                  ? 'border-brand-primary bg-brand-primary/20 text-white shadow-glow-sm font-bold'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Mic className="w-5 h-5 text-brand-secondary" /> Voice Call
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-3">
              {error}
            </p>
          )}

          {/* 3. Start Match Button */}
          <button
            onClick={startSearching}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-primary via-purple-600 to-brand-secondary text-white font-bold text-base shadow-glow hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2.5 border border-white/20"
          >
            <PhoneCall className="w-5 h-5" /> Start Random Match
          </button>
        </motion.div>
      )}

      {/* ── RADAR-STYLE SEARCHING ANIMATION ── */}
      <AnimatePresence>
        {phase === 'searching' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 w-full max-w-sm text-center flex flex-col items-center justify-center space-y-8"
          >
            {/* RADAR CONTAINER */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Radar Outer Glow Rim */}
              <div className="absolute inset-0 rounded-full border border-brand-primary/40 bg-brand-primary/5 backdrop-blur-sm shadow-[0_0_40px_rgba(168,85,247,0.2)]" />

              {/* Concentric Radar Circles */}
              <div className="absolute inset-8 rounded-full border border-brand-primary/25 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-brand-primary/20 pointer-events-none" />
              <div className="absolute inset-24 rounded-full border border-brand-primary/15 pointer-events-none" />

              {/* Radar Grid Crosshairs */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-brand-primary/20 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-brand-primary/20 pointer-events-none" />

              {/* Expanding Pulsing Waves */}
              <motion.div
                animate={{ scale: [0.3, 1.25], opacity: [0.9, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-brand-primary pointer-events-none"
              />
              <motion.div
                animate={{ scale: [0.3, 1.25], opacity: [0.9, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 0.75, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-brand-secondary pointer-events-none"
              />
              <motion.div
                animate={{ scale: [0.3, 1.25], opacity: [0.9, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 1.5, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-pink-500 pointer-events-none"
              />

              {/* 360-Degree Rotating Radar Scanner Beam */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
              >
                <div
                  className="w-1/2 h-1/2 origin-bottom-right"
                  style={{
                    background:
                      'conic-gradient(from 0deg at 100% 100%, rgba(168, 85, 247, 0.4) 0deg, rgba(236, 72, 153, 0.15) 45deg, transparent 90deg)',
                  }}
                />
              </motion.div>

              {/* Simulated Radar Blip Targets */}
              {RADAR_BLIPS.map((blip) => (
                <motion.div
                  key={blip.id}
                  animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 0.8] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: blip.delay }}
                  style={{ top: blip.top, left: blip.left }}
                  className="absolute w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] pointer-events-none"
                />
              ))}

              {/* Center User Avatar & Beacon */}
              <div className="relative z-10 w-20 h-20 rounded-full bg-dark-900/90 border-2 border-brand-primary p-1 shadow-glow flex items-center justify-center">
                <Avatar
                  src={currentUser?.avatar}
                  nickname={currentUser?.nickname || 'Me'}
                  size="md"
                  className="w-full h-full rounded-full"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black animate-ping" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
            </div>

            {/* Radar Status & Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping" />
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Searching for a Match
                </h2>
              </div>
              <p className="text-xs text-white/70 font-medium">
                Scanning for <span className="text-brand-secondary font-bold">{genderLabel}</span> users
                · {callType === 'video' ? 'Video' : 'Audio'} Mode
              </p>
              <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-brand-primary font-mono tracking-wider font-bold">
                Time elapsed: {fmtTime(searchElapsed)}
              </div>
            </div>

            {/* Cancel / Stop Button */}
            <button
              onClick={cancelSearch}
              className="w-full py-3.5 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-sm shadow-glow-pink flex items-center justify-center gap-2 border border-red-400/30 active:scale-95 transition-all"
            >
              <X className="w-5 h-5" /> Cancel Search
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE ONE-TO-ONE CALL ── */}
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
    </div>
  );
};
