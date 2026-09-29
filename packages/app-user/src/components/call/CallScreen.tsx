import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiPhoneSlashFill as PhoneOff, PiMicrophoneFill as Mic, PiMicrophoneSlashFill as MicOff, PiVideoCameraFill as Video, PiVideoCameraSlashFill as VideoOff, PiPhoneCallFill as PhoneCall, PiUsersFill as Users } from 'react-icons/pi';
import { Avatar } from '../user';
import { useCall } from '../../hooks/useCall';
import { callApi, type CallParticipant } from '../../api/call.api';
import { useSocketStore, useAuthStore } from '../../stores';

interface CallScreenProps {
  /** Incoming call payload (from socket) — callee answers with accept. */
  incoming?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    initiator: { nickname: string; avatar?: string } | null;
  };
  /** Outgoing call — caller dials and waits. */
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee?: { nickname: string; avatar?: string } | null;
  };
  /** True when the callee accepted (server emits `call:accept`) — caller stops ringing. */
  accepted?: boolean;
  /** Optional in-call action (random-match "Next") — rendered as a skip button. */
  onNext?: () => void;
  onClose: (outcome?: 'ended' | 'rejected') => void;
}

interface RosterEntry extends CallParticipant {
  /** True when this user is not the local user (i.e., a remote member). */
  remote: boolean;
}

export const CallScreen = ({ incoming, outgoing, accepted, onNext, onClose }: CallScreenProps) => {
  const { joined, remoteUsers, micOn, cameraOn, error, startCall, toggleMic, toggleCamera, endCall } = useCall();
  const socket = useSocketStore((s) => s.socket);
  const joinCallRoom = useSocketStore((s) => s.joinCallRoom);
  const leaveCallRoom = useSocketStore((s) => s.leaveCallRoom);
  const currentUser = useAuthStore((s) => s.user);

  const [answering, setAnswering] = useState(!!incoming);
  const [ringing, setRinging] = useState(!!incoming || !!outgoing);
  const [elapsed, setElapsed] = useState(0);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const endedRef = useRef(false);
  const callIdRef = useRef<string>('');

  const session = incoming
    ? { callId: incoming.callId, channel: incoming.channel, type: incoming.type, token: incoming.token }
    : outgoing
      ? { callId: outgoing.callId, channel: outgoing.channel, type: outgoing.type, token: outgoing.token }
      : undefined;
  callIdRef.current = session?.callId || '';

  const other = incoming?.initiator || outgoing?.callee;
  const isVideo = incoming?.type === 'video' || outgoing?.type === 'video';

  // Join the per-call socket room once the call is known
  useEffect(() => {
    if (!session?.callId) return;
    joinCallRoom(session.callId);
    return () => leaveCallRoom(session.callId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId]);

  // Fetch the live roster when the call starts
  useEffect(() => {
    if (!session?.callId || !joined) return;
    callApi.get(session.callId)
      .then(({ data }) => {
        if (data.success && data.data?.participants) {
          const myId = currentUser?._id || '';
          setRoster(data.data.participants.map((p) => ({ ...p, remote: p._id !== myId })));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, joined]);

  // Live member join/leave updates the roster + removes tiles
  useEffect(() => {
    if (!socket || !session?.callId) return;
    const onMemberJoined = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      const myId = currentUser?._id || '';
      setRoster((prev) => {
        if (!payload?.userId || prev.some((p) => p._id === payload.userId)) return prev;
        return [...prev, { _id: payload.userId, nickname: payload.nickname || 'User', avatar: payload.avatar, remote: payload.userId !== myId }];
      });
    };
    const onMemberLeft = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      setRoster((prev) => prev.filter((p) => p._id !== payload?.userId));
    };
    const onCallEnded = (payload: any) => {
      if (payload?.callId !== session.callId) return;
      // Call ended for everyone — close locally (guard against double close).
      if (!endedRef.current) {
        endedRef.current = true;
        endCall().finally(() => onClose('ended'));
      }
    };

    socket.on('call:member-joined', onMemberJoined);
    socket.on('call:member-left', onMemberLeft);
    socket.on('call:end', onCallEnded);

    return () => {
      socket.off('call:member-joined', onMemberJoined);
      socket.off('call:member-left', onMemberLeft);
      socket.off('call:end', onCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, session?.callId]);

  // Join when session is known (outgoing joins immediately; incoming after answering).
  useEffect(() => {
    if (!session || (!answering && !outgoing)) return;

    startCall({
      channel: session.channel,
      token: session.token,
      type: session.type,
    })
      .then(() => {
        // Incoming (answering) → stop ringing now that we're connected.
        if (answering) setRinging(false);
      })
      .catch(() => {
        if (answering) setRinging(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId, answering]);

  // Callee accepted (`call:accept` received) → the outgoing caller stops ringing.
  useEffect(() => {
    if (accepted && outgoing) setRinging(false);
  }, [accepted, outgoing]);

  // Call timer
  useEffect(() => {
    if (!joined) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [joined]);

  const handleAccept = async () => {
    if (!incoming) return;
    try {
      const { data } = await callApi.accept(incoming.callId);
      if (data.success && data.data) {
        // Accept response carries the channel token for us
        startCall({
          channel: data.data.channel,
          token: data.data.token,
          type: data.data.type,
        }).catch(() => {});
      }
      setAnswering(true);
    } catch {
      setAnswering(true); // still attempt join with the invite token
    }
  };

  const handleReject = async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (incoming) await callApi.end(incoming.callId, 'rejected').catch(() => {});
    await endCall();
    onClose('rejected');
  };

  const handleHangup = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (session) await callApi.end(session.callId, 'ended').catch(() => {});
    await endCall();
    onClose('ended');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.callId]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Remote tiles are per-UID containers that useCall fills with Agora video.
  const gridClass =
    remoteUsers.length <= 1 ? 'grid-cols-1' :
    remoteUsers.length <= 4 ? 'grid-cols-2' :
    'grid-cols-3';

  const remoteNames = roster.filter((r) => r.remote).map((r) => r.nickname);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
      role="dialog"
      aria-label={isVideo ? 'Video call' : 'Audio call'}
    >
      {/* Video area — remote video tiles render here */}
      <div id="call-video-area" className="absolute inset-0" style={{ background: '#000' }} />

      {/* Remote video grid (video calls) */}
      {joined && isVideo && remoteUsers.length > 0 && (
        <div className={`absolute inset-0 grid ${gridClass} gap-0.5`}>
          {remoteUsers.map((uid) => (
            <div key={String(uid)} className="relative bg-black/40 min-h-0 min-w-0">
              {/* useCall creates/plays into #remote-container-<uid> */}
              <div id={`remote-container-${uid}`} className="absolute inset-0" />
              <span className="absolute bottom-1 left-2 text-[10px] text-white/70 bg-black/50 rounded px-1.5 py-0.5 pointer-events-none">
                {remoteNames[remoteUsers.indexOf(uid)] || `Member ${uid}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Local preview (video calls) — small PiP */}
      <AnimatePresence>
        {joined && isVideo && cameraOn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border border-white/20 z-10 shadow-card"
          >
            <video id="call-local-video" className="w-full h-full object-cover" autoPlay playsInline muted />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio-call / ringing backdrop */}
      {(ringing || !isVideo) && (
        <div className="absolute inset-0 z-[1] bg-mesh flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-24 h-24 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center">
            {isVideo ? (
              <Video className="w-10 h-10 text-brand-primary" />
            ) : (
              <PhoneCall className={`w-10 h-10 text-brand-primary ${ringing ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{other?.nickname || 'Unknown'}</p>
            <p className="text-dark-400 text-sm mt-1">
              {ringing
                ? (incoming ? 'Incoming call…' : 'Ringing…')
                : error || (joined ? fmt(elapsed) : 'Connecting…')}
            </p>
          </div>
          <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="lg" className="ring-4 ring-white/10" />
          {roster.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Users className="w-4 h-4" />
              {roster.length} member{roster.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute bottom-24 inset-x-0 z-20 flex justify-center px-6">
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-10 inset-x-0 z-20 flex items-center justify-center gap-4">
        {incoming && ringing && !answering ? (
          <>
            <button
              onClick={handleReject}
              aria-label="Decline call"
              className="w-14 h-14 rounded-full bg-red-600 btn-glow-pink flex items-center justify-center"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleAccept}
              aria-label="Accept call"
              className="w-14 h-14 rounded-full bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center"
            >
              <PhoneCall className="w-6 h-6 text-white" />
            </button>
          </>
        ) : (
          <>
            {joined && onNext && (
              <button
                onClick={onNext}
                aria-label="Next match"
                className="w-12 h-12 rounded-full glass-chip flex items-center justify-center text-xs font-bold"
                title="Next"
              >
                NEXT
              </button>
            )}
            {joined && (
              <>
                {isVideo && (
                  <button
                    onClick={toggleCamera}
                    aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
                    className="w-12 h-12 rounded-full glass-chip flex items-center justify-center"
                  >
                    {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-red-400" />}
                  </button>
                )}
                <button
                  onClick={toggleMic}
                  aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
                  className="w-12 h-12 rounded-full glass-chip flex items-center justify-center"
                >
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-red-400" />}
                </button>
              </>
            )}
            <button
              onClick={handleHangup}
              aria-label="End call"
              className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 btn-glow-pink flex items-center justify-center"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};
