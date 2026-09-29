import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PiVideoCameraFill as Video, PiMicrophoneFill as Mic, PiPhoneCallFill as PhoneCall, PiXBold as X, PiCaretLeftBold as ArrowLeft, PiLightningFill as Zap } from 'react-icons/pi';
import { useSocketStore } from '../stores';
import { callApi } from '../api';
import { CallScreen, type IncomingGroupInvite } from '../components/call';

type Phase = 'idle' | 'searching' | 'calling';
type CallType = 'audio' | 'video';

interface MatchInvite {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  initiatorId: string;
  token: string;
  initiator: { nickname: string; avatar?: string } | null;
}

/**
 * Random 1:1 match — press Match to join the queue, get paired with a
 * stranger, call. Next re-queues, Stop leaves and returns Home.
 */
export const Match = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const joinMatch = useSocketStore((s) => s.joinMatch);
  const leaveMatch = useSocketStore((s) => s.leaveMatch);

  const [phase, setPhase] = useState<Phase>('idle');
  const [callType, setCallType] = useState<CallType>('video');
  const [invite, setInvite] = useState<MatchInvite | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [error, setError] = useState('');
  const activeCallRef = useRef<string>('');

  const startSearching = useCallback(() => {
    setError('');
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('searching');
    joinMatch(callType);
  }, [joinMatch, callType]);

  const stopAndLeave = useCallback(() => {
    leaveMatch();
    setPhase('idle');
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    navigate('/');
  }, [leaveMatch, navigate]);

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
      joinMatch(callType);
    } else {
      setPhase('idle');
    }
  }, [joinMatch, callType]);

  // Next — end the current call and immediately re-enter the queue.
  const handleNext = useCallback(async () => {
    const callId = activeCallRef.current;
    if (callId) await callApi.end(callId, 'ended').catch(() => {});
    setInvite(null);
    setCallAccepted(false);
    activeCallRef.current = '';
    setPhase('searching');
    joinMatch(callType);
  }, [joinMatch, callType]);

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/15 via-transparent to-brand-secondary/10 pointer-events-none" />

      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={stopAndLeave}
          aria-label="Back"
          className="glass-chip w-9 h-9 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
          <div>
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-glow-sm mb-4"
            >
              <Zap className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-extrabold">Random Match</h1>
            <p className="text-dark-400 text-sm mt-2">
              Get paired with a stranger for a 1:1 call.
            </p>
          </div>

          {/* Call type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCallType('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                callType === 'video'
                  ? 'border-brand-primary bg-brand-primary/20 text-white'
                  : 'border-dark-700 bg-dark-800 text-dark-400'
              }`}
            >
              <Video className="w-5 h-5" /> Video
            </button>
            <button
              onClick={() => setCallType('audio')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                callType === 'audio'
                  ? 'border-brand-primary bg-brand-primary/20 text-white'
                  : 'border-dark-700 bg-dark-800 text-dark-400'
              }`}
            >
              <Mic className="w-5 h-5" /> Audio
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={startSearching}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold text-lg btn-glow flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-5 h-5" /> Match
          </button>
        </div>
      )}

      {/* ── SEARCHING ── */}
      <AnimatePresence>
        {phase === 'searching' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 w-full max-w-sm text-center space-y-8"
          >
            <div className="relative mx-auto w-40 h-40">
              <motion.div
                animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-brand-primary"
              />
              <motion.div
                animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}
                className="absolute inset-0 rounded-full border-2 border-brand-secondary"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-brand-primary/20 border border-brand-primary/50 flex items-center justify-center">
                  <PhoneCall className="w-8 h-8 text-brand-primary animate-pulse" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold">Looking for a stranger…</h2>
              <p className="text-dark-400 text-sm mt-1">
                {callType === 'video' ? 'Video' : 'Audio'} match · hang tight
              </p>
            </div>

            <button
              onClick={stopAndLeave}
              className="w-full py-3.5 rounded-2xl bg-red-600/90 text-white font-bold btn-glow-pink flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" /> Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CALL ── */}
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
