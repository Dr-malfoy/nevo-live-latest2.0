import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiFlameFill as Flame,
  PiXBold as X,
  PiGearSixFill as SettingsIcon,
  PiCaretLeftBold as CaretLeft,
  PiGiftFill as GiftIcon,
  PiHeartFill as Heart,
  PiPaperPlaneRightFill as SendIcon,
  PiShareNetworkFill as ShareIcon,
  PiTrophyFill as Trophy,
  PiCrownFill as Crown,
  PiCheckBold as Check,
  PiLightningFill as Lightning,
  PiUsersFill as UsersIcon,
  PiTimerFill as TimerIcon,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiVideoCameraFill as Video,
  PiVideoCameraSlashFill as VideoOff,
  PiArrowsClockwiseBold as SwitchCameraIcon,
  PiSlidersBold as Sliders,
  PiMagicWandFill as Wand2,
  PiSpeakerHighFill as SpeakerOn,
  PiSpeakerSlashFill as SpeakerOff,
  PiSwordBold as Swords,
  PiSparkleFill as Sparkle,
  PiTrendUpBold as TrendUp,
} from 'react-icons/pi';
import { getMediaUrl } from '../../lib/media';
import { MicRequestBanner } from './MicRequestBanner';
import { useUIStore } from '../../stores';
import type { LiveHost, RoomMessage } from './types';

/** Creates an animated 30fps canvas stream as fallback when camera hardware is absent or occupied */
function createLiveCanvasStream(title: string): MediaStream {
  if (typeof document === 'undefined') return new MediaStream();
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new MediaStream();

  let hue = 260;
  let angle = 0;
  let animId: number;

  const draw = () => {
    angle += 0.05;
    hue = (hue + 0.4) % 360;

    // Vibrant Live Gradient
    const grad = ctx.createLinearGradient(0, 0, 720, 1280);
    grad.addColorStop(0, `hsl(${hue}, 80%, 14%)`);
    grad.addColorStop(0.5, '#0b0616');
    grad.addColorStop(1, `hsl(${(hue + 60) % 360}, 80%, 10%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 720, 1280);

    // Glowing pulsing outer ring
    const pulse = 135 + Math.sin(angle) * 18;
    ctx.beginPath();
    ctx.arc(360, 480, pulse, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 85%, 60%, 0.22)`;
    ctx.fill();

    // Center circular avatar container
    ctx.beginPath();
    ctx.arc(360, 480, 105, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 70%, 40%)`;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Host initial monogram
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 85px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((title || 'Host').charAt(0).toUpperCase(), 360, 480);

    // Equalizer voice bars
    const barCount = 7;
    const barWidth = 14;
    const gap = 10;
    const startX = 360 - ((barCount * (barWidth + gap)) / 2);
    for (let i = 0; i < barCount; i++) {
      const h = 25 + Math.abs(Math.sin(angle * 2.2 + i * 0.8)) * 55;
      const x = startX + i * (barWidth + gap);
      const y = 650 - h / 2;
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(x, y, barWidth, h, 6);
      } else {
        ctx.rect(x, y, barWidth, h);
      }
      ctx.fill();
    }

    // Host Name
    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title || 'Host', 360, 750);

    // Live Status
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('🔴 LIVE IN BATTLE', 360, 800);

    animId = requestAnimationFrame(draw);
  };

  animId = requestAnimationFrame(draw);
  const stream: MediaStream = (canvas as any).captureStream
    ? (canvas as any).captureStream(30)
    : (canvas as any).mozCaptureStream(30);

  (stream as any)._stopCanvas = () => cancelAnimationFrame(animId);
  return stream;
}

/** Renders gift icon as image when URL/path is provided, or as emoji/icon */
function renderGiftIcon(iconStr?: string) {
  if (!iconStr) return <span className="text-sm shrink-0">🎁</span>;
  const isUrl =
    iconStr.startsWith('http://') ||
    iconStr.startsWith('https://') ||
    iconStr.startsWith('/') ||
    iconStr.startsWith('data:') ||
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(iconStr);

  if (isUrl) {
    return (
      <img
        src={getMediaUrl(iconStr)}
        alt="Gift"
        className="w-5 h-5 object-contain shrink-0 rounded"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
        }}
      />
    );
  }
  return <span className="text-sm shrink-0">{iconStr}</span>;
}

export interface PKHostData {
  userId: string;
  streamId?: string;
  nickname: string;
  avatar?: string;
  level?: number;
  score: number;
  viewerCount?: number;
  winStreak?: number;
}

export interface PKRecentGift {
  id?: string;
  _id?: string;
  icon?: string;
  giftIcon?: string;
  name?: string;
  giftName?: string;
  points?: number;
  amount?: number;
  senderName?: string;
  senderAvatar?: string;
  hostSide?: 'left' | 'right' | 'A' | 'B';
  targetSide?: 'left' | 'right' | 'A' | 'B';
  count?: number;
}

export interface PKBattleViewProps {
  battleId: string;
  streamIdA?: string;
  streamIdB?: string;
  currentStreamId?: string;
  socket?: any;
  localMediaStream?: MediaStream | null;
  initialDurationSeconds?: number;
  endsAt?: string | Date;
  isBattleFinished?: boolean;
  leftHost: PKHostData;
  rightHost: PKHostData;
  isHost: boolean;
  currentUserId?: string;
  messages: RoomMessage[];
  onSendMessage: (msg: string) => void;
  onSendGift: (targetHostId: string, hostSide: 'left' | 'right') => void;
  onEndPK?: () => void;
  onQuitPK?: () => void;
  onMinimize?: () => void;
  onLike?: () => void;
  likeCount?: number;
  recentGifts?: PKRecentGift[];
  // Host tools & media controls
  cameraOn?: boolean;
  micOn?: boolean;
  videoEnabled?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onSwitchCamera?: () => void;
  speakers?: import('./TopGifterSeats').LiveSpeakerItem[];
  isSpeaker?: boolean;
  micRequestPending?: boolean;
  onRequestMic?: () => void;
  onMuteSpeaker?: (userId: string, isMuted: boolean) => void;
  onKickSpeaker?: (userId: string) => void;
  pendingMicRequester?: import('./MicRequestBanner').MicRequester | null;
  onAcceptMicRequest?: (requester: import('./MicRequestBanner').MicRequester) => void;
  onDeclineMicRequest?: (requester: import('./MicRequestBanner').MicRequester) => void;
  onOpenTools?: () => void;
  onOpenBeauty?: () => void;
  onOpenFilters?: () => void;
  onOpenLiveData?: () => void;
  onOpenMessenger?: () => void;
  onOpenPKRank?: () => void;
  onOpenGift?: () => void;
  onShare?: () => void;
  isMirrored?: boolean;
}

export const PKBattleView: React.FC<PKBattleViewProps> = ({
  battleId,
  streamIdA,
  streamIdB,
  currentStreamId,
  socket,
  localMediaStream,
  initialDurationSeconds = 180,
  endsAt,
  isBattleFinished = false,
  leftHost,
  rightHost,
  isHost,
  isMirrored = false,
  currentUserId,
  messages = [],
  onSendMessage,
  onSendGift,
  onEndPK,
  onQuitPK,
  onMinimize,
  onLike,
  likeCount = 0,
  recentGifts = [],
  cameraOn = true,
  micOn = true,
  videoEnabled = true,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  speakers = [],
  isSpeaker = false,
  micRequestPending = false,
  onRequestMic,
  onMuteSpeaker,
  onKickSpeaker,
  pendingMicRequester = null,
  onAcceptMicRequest,
  onDeclineMicRequest,
  onOpenTools,
  onOpenBeauty,
  onOpenFilters,
  onOpenLiveData,
  onOpenMessenger,
  onOpenPKRank,
  onOpenGift,
  onShare,
}) => {
  // Resilient target end time calculated from endsAt timestamp or initial duration
  const targetEndTimeRef = useRef<number>(
    endsAt ? new Date(endsAt).getTime() : Date.now() + (initialDurationSeconds || 180) * 1000
  );

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    return Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
  });
  const [isFinished, setIsFinished] = useState(Boolean(isBattleFinished));
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  const [textInput, setTextInput] = useState('');

  // Determine Host IDs and active sides
  const hostAId = leftHost.userId || (leftHost as any)._id;
  const hostBId = rightHost.userId || (rightHost as any)._id;

  const isCurrentHostA = Boolean(currentUserId && hostAId && currentUserId === hostAId);
  const isCurrentHostB = Boolean(currentUserId && hostBId && currentUserId === hostBId);
  const isCurrentHost = isHost || isCurrentHostA || isCurrentHostB;

  // Which side is this client's primary stream?
  // Left = Host A, Right = Host B
  const isSideA = isCurrentHostA || (!isCurrentHostB && (currentStreamId ? currentStreamId === streamIdA : true));
  const mySide = isSideA ? 'left' : 'right';
  const opponentSide = isSideA ? 'right' : 'left';
  const opponentStreamId = isSideA ? streamIdB : streamIdA;

  // Stable refs for WebRTC to prevent connection tearing down on state re-renders
  const isCurrentHostRef = useRef(isCurrentHost);
  isCurrentHostRef.current = isCurrentHost;

  const isSideARef = useRef(isSideA);
  isSideARef.current = isSideA;

  const mySideRef = useRef(mySide);
  mySideRef.current = mySide;

  const opponentSideRef = useRef(opponentSide);
  opponentSideRef.current = opponentSide;

  const currentStreamIdRef = useRef(currentStreamId);
  currentStreamIdRef.current = currentStreamId;

  const streamIdARef = useRef(streamIdA);
  streamIdARef.current = streamIdA;

  const streamIdBRef = useRef(streamIdB);
  streamIdBRef.current = streamIdB;

  const localMediaStreamRef = useRef(localMediaStream);
  localMediaStreamRef.current = localMediaStream;

  const leftNicknameRef = useRef(leftHost.nickname);
  leftNicknameRef.current = leftHost.nickname;

  const rightNicknameRef = useRef(rightHost.nickname);
  rightNicknameRef.current = rightHost.nickname;

  const [selectedSide, setSelectedSide] = useState<'left' | 'right'>(
    isCurrentHostB ? 'right' : 'left'
  );

  // Keep callback refs stable across frequent re-renders
  const onEndPKRef = useRef(onEndPK);
  const onQuitPKRef = useRef(onQuitPK);
  useEffect(() => {
    onEndPKRef.current = onEndPK;
    onQuitPKRef.current = onQuitPK;
  });

  // Score computation: monotonically accumulating scores that ONLY INCREASE, never decrease!
  const [liveScoreA, setLiveScoreA] = useState<number>(() => Math.max(0, Number(leftHost.score) || 0));
  const [liveScoreB, setLiveScoreB] = useState<number>(() => Math.max(0, Number(rightHost.score) || 0));

  useEffect(() => {
    const s = Math.max(0, Number(leftHost.score) || 0);
    setLiveScoreA((prev) => Math.max(prev, s));
  }, [leftHost.score]);

  useEffect(() => {
    const s = Math.max(0, Number(rightHost.score) || 0);
    setLiveScoreB((prev) => Math.max(prev, s));
  }, [rightHost.score]);

  useEffect(() => {
    if (!socket) return;
    const onPkLiveScore = (data: any) => {
      if (data.battleId && battleId && data.battleId !== battleId) return;
      if (typeof data.scoreA === 'number') {
        setLiveScoreA((prev) => Math.max(prev, data.scoreA));
      }
      if (typeof data.scoreB === 'number') {
        setLiveScoreB((prev) => Math.max(prev, data.scoreB));
      }
    };
    socket.on('pk:live:score', onPkLiveScore);
    return () => {
      socket.off('pk:live:score', onPkLiveScore);
    };
  }, [socket, battleId]);

  const leftScore = liveScoreA;
  const rightScore = liveScoreB;
  const totalScore = leftScore + rightScore;
  const leadDiff = Math.abs(leftScore - rightScore);
  const leadSide = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie';
  const winner = leftScore > rightScore ? 'left' : rightScore > leftScore ? 'right' : 'tie';

  // Monotonically growing gauge bar:
  // Each host's progress bar ONLY GROWS as their score increases, and NEVER shrinks backwards!
  const getFillPercentage = (score: number) => {
    if (score <= 0) return 0;
    // Starts at 8% with first score, smoothly climbs toward center (max 46%), never goes down!
    return Math.min(46, Math.max(8, Math.round(8 + Math.log10(Math.max(1, score / 50) + 1) * 32)));
  };

  const leftFillPct = getFillPercentage(leftScore);
  const rightFillPct = getFillPercentage(rightScore);

  // Real Dynamic Viewer Count calculation (per host & merged)
  const [liveLeftViewers, setLiveLeftViewers] = useState<number>(
    Math.max(0, Number(leftHost.viewerCount) || 0)
  );
  const [liveRightViewers, setLiveRightViewers] = useState<number>(
    Math.max(0, Number(rightHost.viewerCount) || 0)
  );

  useEffect(() => {
    setLiveLeftViewers(Math.max(0, Number(leftHost.viewerCount) || 0));
  }, [leftHost.viewerCount]);

  useEffect(() => {
    setLiveRightViewers(Math.max(0, Number(rightHost.viewerCount) || 0));
  }, [rightHost.viewerCount]);

  useEffect(() => {
    if (!socket) return;
    const onPkViewerCount = ({ streamId, count, side }: any) => {
      const num = Math.max(0, Number(count) || 0);
      if (side === 'left' || streamId === streamIdA) {
        setLiveLeftViewers(num);
      } else if (side === 'right' || streamId === streamIdB) {
        setLiveRightViewers(num);
      }
    };
    socket.on('pk:live:viewer-count', onPkViewerCount);
    return () => {
      socket.off('pk:live:viewer-count', onPkViewerCount);
    };
  }, [socket, streamIdA, streamIdB]);

  const leftViewers = liveLeftViewers;
  const rightViewers = liveRightViewers;
  const mergedViewerCount = leftViewers + rightViewers;

  const formatViewerNumber = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  // Sync isBattleFinished if server ends battle
  useEffect(() => {
    if (isBattleFinished) {
      setIsFinished(true);
    }
  }, [isBattleFinished]);

  // Main countdown timer: computes exact wall-clock remaining time
  useEffect(() => {
    if (endsAt) {
      const parsed = new Date(endsAt).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        targetEndTimeRef.current = parsed;
      }
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsFinished(true);
        if (onEndPKRef.current) {
          onEndPKRef.current();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [battleId, endsAt]);

  // Auto-close countdown when finished (closes back to normal live after 5s)
  useEffect(() => {
    if (!isFinished) return;
    setAutoCloseCountdown(5);

    const closeInterval = setInterval(() => {
      setAutoCloseCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(closeInterval);
          if (onQuitPKRef.current) {
            onQuitPKRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(closeInterval);
  }, [isFinished]);

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showToast = useUIStore((s) => s.showToast);
  const [hasGivenPkLove, setHasGivenPkLove] = useState(false);
  const syntheticStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setHasGivenPkLove(false);
  }, [battleId]);

  const handleHeartClick = () => {
    onLike?.();

    if (hasGivenPkLove) {
      showToast('You already sent your Love points for this battle! (1 per battle) ❤️', 'info');
      return;
    }

    setHasGivenPkLove(true);
    const targetSide = selectedSide === 'left' ? 'A' : 'B';
    const targetNickname = selectedSide === 'left' ? leftHost.nickname : rightHost.nickname;
    const targetStream = selectedSide === 'left' ? streamIdA : streamIdB;

    if (socket && battleId) {
      socket.emit('pk:live:like', {
        battleId,
        side: targetSide,
        streamId: targetStream,
      });
    }
    showToast(`+100 PK Points sent to ${targetNickname}! ❤️`, 'success');
  };

  // PK Dual-Video Streaming & Dedicated WebRTC Connection Effect
  useEffect(() => {
    let opponentPc: RTCPeerConnection | null = null;
    const sendingPcs = new Map<string, RTCPeerConnection>();

    const leftContainer = document.getElementById('pk-video-left');
    const rightContainer = document.getElementById('pk-video-right');

    if (!leftContainer || !rightContainer) return;

    // Helper to safely play a MediaStream inside a container without moving existing nodes
    const renderStreamInContainer = (container: HTMLElement, stream: MediaStream, isMuted: boolean) => {
      if (!container || !stream) return;
      let videoEl = container.querySelector('video') as HTMLVideoElement;
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.className = 'w-full h-full object-cover';
        container.appendChild(videoEl);
      }
      videoEl.muted = isMuted;
      if (videoEl.srcObject === stream) {
        // Stream already attached — do not reassign to prevent decoder flush / blanking
        return;
      }
      videoEl.srcObject = stream;
      videoEl.play().catch(() => {
        if (!isMuted) {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        }
      });
    };

    // Helper to resolve the live local media stream across localMediaStream, Agora DOM video, and tracks
    const getActiveLocalStream = (): MediaStream | null => {
      if (localMediaStream && localMediaStream.getTracks().length > 0) {
        const vTrack = localMediaStream.getVideoTracks()[0];
        if (vTrack && vTrack.readyState === 'live') {
          return localMediaStream;
        }
      }
      if (typeof document !== 'undefined') {
        const agoraAreaEl = document.getElementById('agora-video-area');
        const existingVideo = agoraAreaEl?.querySelector('video') as HTMLVideoElement;
        if (existingVideo && existingVideo.srcObject instanceof MediaStream && existingVideo.srcObject.getTracks().length > 0) {
          return existingVideo.srcObject;
        }
      }
      return null;
    };

    // 1. Render Current Stream (Host's own stream or viewer's primary room stream)
    let streamRendered = false;
    const renderMyStream = () => {
      const mySide = mySideRef.current;
      const myContainer = mySide === 'left' ? leftContainer : rightContainer;
      const activeStream = getActiveLocalStream();
      if (activeStream && activeStream.getVideoTracks().length > 0) {
        renderStreamInContainer(myContainer, activeStream, true);
        streamRendered = true;
      } else if (!streamRendered) {
        if (!syntheticStreamRef.current) {
          syntheticStreamRef.current = createLiveCanvasStream(
            mySide === 'left' ? leftNicknameRef.current : rightNicknameRef.current
          );
        }
        renderStreamInContainer(myContainer, syntheticStreamRef.current, true);
      }
    };

    renderMyStream();
    const intervalCheck = setInterval(renderMyStream, 1500);

    // 2. Connect to the OPPONENT stream via Dedicated PK WebRTC Signaling
    const RTC_CONFIG: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    if (socket && opponentStreamId) {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      opponentPc = pc;

      // Handle receiving opponent stream tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        const targetContainer = opponentSideRef.current === 'left' ? leftContainer : rightContainer;
        // Unmuted so host and viewers can hear the opponent
        renderStreamInContainer(targetContainer, stream, false);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && (opponentPc as any)?._remoteSocketId) {
          socket.emit('pk:signal:candidate', {
            toSocketId: (opponentPc as any)._remoteSocketId,
            candidate: event.candidate,
            battleId,
            streamId: opponentStreamId,
          });
        }
      };

      // Handler when opponent host sends an offer for their stream
      let isProcessingOffer = false;
      const onOpponentOffer = async ({ fromSocketId, offer }: any) => {
        if (!offer || fromSocketId === socket.id) return;
        if (isProcessingOffer) return;
        isProcessingOffer = true;
        try {
          (pc as any)._remoteSocketId = fromSocketId;
          if (pc.signalingState === 'have-remote-offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('pk:signal:answer', {
              toSocketId: fromSocketId,
              answer,
              battleId,
              streamId: opponentStreamId,
            });
            return;
          }
          if (pc.signalingState !== 'stable') {
            try {
              await pc.setLocalDescription({ type: 'rollback' } as any);
            } catch {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          if (pc.signalingState === 'have-remote-offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('pk:signal:answer', {
              toSocketId: fromSocketId,
              answer,
              battleId,
              streamId: opponentStreamId,
            });
          }
        } catch (err) {
          console.warn('[PKBattleView] WebRTC answer error for opponent:', err);
        } finally {
          isProcessingOffer = false;
        }
      };

      // Handler when a peer (opponent host or audience) requests our stream
      const onPeerJoinedForMe = async ({ peerSocketId, streamId }: any) => {
        if (!isCurrentHostRef.current || !peerSocketId || peerSocketId === socket.id) return;
        const myStreamId = isSideARef.current ? streamIdARef.current : streamIdBRef.current;
        if (streamId && myStreamId && streamId !== myStreamId) return;

        const existingPc = sendingPcs.get(peerSocketId);
        if (existingPc && (existingPc.connectionState === 'connected' || existingPc.iceConnectionState === 'connected')) {
          return;
        }

        let streamToShare = getActiveLocalStream();
        if (!streamToShare || streamToShare.getVideoTracks().length === 0) {
          if (!syntheticStreamRef.current) {
            syntheticStreamRef.current = createLiveCanvasStream(
              mySideRef.current === 'left' ? leftNicknameRef.current : rightNicknameRef.current
            );
          }
          streamToShare = syntheticStreamRef.current;
        }
        if (!streamToShare) return;

        try {
          const oldPc = sendingPcs.get(peerSocketId);
          if (oldPc) {
            oldPc.close();
            sendingPcs.delete(peerSocketId);
          }

          const sPc = new RTCPeerConnection(RTC_CONFIG);
          sendingPcs.set(peerSocketId, sPc);

          streamToShare.getTracks().forEach((track) => sPc.addTrack(track, streamToShare!));

          sPc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('pk:signal:candidate', {
                toSocketId: peerSocketId,
                candidate: event.candidate,
                battleId,
                streamId: myStreamId,
              });
            }
          };

          const offer = await sPc.createOffer();
          await sPc.setLocalDescription(offer);
          socket.emit('pk:signal:offer', {
            toSocketId: peerSocketId,
            offer,
            battleId,
            streamId: myStreamId,
          });
        } catch (err) {
          console.warn('[PKBattleView] Failed to broadcast stream to peer:', err);
        }
      };

      // Handler when peer returns answer
      const onPkAnswer = async ({ fromSocketId, answer }: any) => {
        const sPc = sendingPcs.get(fromSocketId);
        if (sPc && answer && sPc.signalingState === 'have-local-offer') {
          try {
            await sPc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[PKBattleView] Failed to set remote description on sender:', e);
          }
        }
      };

      // Bidirectional ICE candidate routing
      const onPkCandidate = async ({ fromSocketId, candidate }: any) => {
        if (!candidate) return;
        if (pc && (pc as any)._remoteSocketId === fromSocketId && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            return;
          } catch {}
        }
        const sPc = sendingPcs.get(fromSocketId);
        if (sPc && sPc.remoteDescription) {
          try {
            await sPc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        }
      };

      socket.on('pk:signal:offer', onOpponentOffer);
      socket.on('pk:signal:answer', onPkAnswer);
      socket.on('pk:signal:candidate', onPkCandidate);
      socket.on('pk:signal:peer-joined', onPeerJoinedForMe);

      // Initial request for opponent's stream
      socket.emit('pk:signal:request-stream', { streamId: opponentStreamId, battleId });

      // Gentle retry if opponent video is not playing after 3 seconds
      const retryTimer = setInterval(() => {
        const targetContainer = opponentSideRef.current === 'left' ? leftContainer : rightContainer;
        const video = targetContainer.querySelector('video');
        if (!video || video.paused || video.readyState < 2) {
          socket.emit('pk:signal:request-stream', { streamId: opponentStreamId, battleId });
        }
      }, 3000);

      return () => {
        clearInterval(intervalCheck);
        clearInterval(retryTimer);
        socket.off('pk:signal:offer', onOpponentOffer);
        socket.off('pk:signal:answer', onPkAnswer);
        socket.off('pk:signal:candidate', onPkCandidate);
        socket.off('pk:signal:peer-joined', onPeerJoinedForMe);
        if (opponentPc) opponentPc.close();
        sendingPcs.forEach((pc) => pc.close());
        sendingPcs.clear();
      };
    }

    return () => {
      clearInterval(intervalCheck);
      sendingPcs.forEach((pc) => pc.close());
      sendingPcs.clear();
    };
  }, [socket, battleId, opponentStreamId]);

  // Process and separate received gifts for Host A (Left) and Host B (Right)
  const { leftGifts, rightGifts, leftGiftTotal, rightGiftTotal } = useMemo(() => {
    const left: PKRecentGift[] = [];
    const right: PKRecentGift[] = [];

    // 1. Process recent gifts prop from socket / pk battle events
    if (Array.isArray(recentGifts)) {
      for (const g of recentGifts) {
        if (!g) continue;
        const isRight =
          g.hostSide === 'right' ||
          g.hostSide === 'B' ||
          g.targetSide === 'right' ||
          g.targetSide === 'B';
        const item: PKRecentGift = {
          id: g.id || g._id || Math.random().toString(),
          icon: g.icon || g.giftIcon || '🎁',
          name: g.name || g.giftName || 'Gift',
          points: g.points || g.amount || 10,
          count: g.count || 1,
          senderName: g.senderName || 'Supporter',
          senderAvatar: g.senderAvatar,
          hostSide: isRight ? 'right' : 'left',
        };
        if (isRight) right.push(item);
        else left.push(item);
      }
    }

    // 2. Process room chat gift messages
    if (Array.isArray(messages)) {
      for (const m of messages) {
        if (!m.isGift || !m.gift) continue;
        const pts = (m.gift.diamondPrice || m.gift.coinPrice || 10) * (m.count || 1);
        const isRight =
          (m as any).receiverId === rightHost.userId || (m as any).targetSide === 'B';
        const item: PKRecentGift = {
          id: `${m.userId}-${m.gift._id || m.gift.name}-${pts}`,
          icon: m.gift.icon || m.gift.animation || '🎁',
          name: m.gift.name || 'Gift',
          points: pts,
          count: m.count || 1,
          senderName: m.nickname || 'Viewer',
          senderAvatar: m.avatar,
          hostSide: isRight ? 'right' : 'left',
        };
        if (isRight) {
          if (!right.some((x) => x.id === item.id)) right.push(item);
        } else {
          if (!left.some((x) => x.id === item.id)) left.push(item);
        }
      }
    }

    // By default blank: only actual gifts sent during the stream/battle are shown
    const finalLeft = left;
    const finalRight = right;

    const lTotal = finalLeft.reduce((acc, curr) => acc + (curr.points || curr.amount || 0), 0);
    const rTotal = finalRight.reduce((acc, curr) => acc + (curr.points || curr.amount || 0), 0);

    return {
      leftGifts: finalLeft.slice(-8).reverse(),
      rightGifts: finalRight.slice(-8).reverse(),
      leftGiftTotal: lTotal,
      rightGiftTotal: rTotal,
    };
  }, [recentGifts, messages, rightHost.userId]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendMessage(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#080511] text-white overflow-hidden select-none">
      {/* Dynamic atmospheric ambient glow behind the battle arena */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-purple-700/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-10 right-0 w-80 h-80 bg-pink-700/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-80 h-60 bg-indigo-700/15 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. TOP HEADER: Back + Merged User Count + Center Remaining Time (Min:Sec) + Tools/Exit */}
      <div className="relative z-20 flex items-center justify-between px-3 pt-3 pb-2 shrink-0 border-b border-white/5 bg-black/40 backdrop-blur-md">
        {/* Left: Minimize button & Merged Total Viewers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMinimize}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center text-white/90"
            aria-label="Back"
          >
            <CaretLeft className="w-5 h-5" />
          </button>

          {/* Merged Audience / User Count */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-purple-500/30 backdrop-blur-md shadow-sm"
            title="Total Merged Viewers"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <UsersIcon className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-xs font-black tracking-wide text-white tabular-nums">
              {formatViewerNumber(mergedViewerCount)}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-purple-200/70 hidden sm:inline">
              Viewers
            </span>
          </div>
        </div>

        {/* Center: Prominent Remaining Time Capsule (Min:Sec) */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-950/90 via-black to-pink-950/90 border border-purple-400/40 backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <TimerIcon className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-sm sm:text-base font-black tracking-widest text-amber-300 tabular-nums drop-shadow">
              {formatTime(timeLeft)}
            </span>
          </div>
          <span className="text-[9px] font-extrabold text-white/50 uppercase tracking-widest mt-0.5">
            Round 1 of 1
          </span>
        </div>

        {/* Right: Host Mic, Tools button / Settings & Exit */}
        <div className="flex items-center gap-1.5">
          {/* Quick Host Mic On/Off button */}
          {isHost && onToggleMic && (
            <button
              type="button"
              onClick={onToggleMic}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-black transition-all shadow-sm active:scale-95 ${
                micOn
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-red-500/25 border-red-400/50 text-red-300'
              }`}
              title={micOn ? 'Microphone On (Tap to Mute)' : 'Microphone Muted (Tap to Unmute)'}
            >
              {micOn ? <Mic className="w-3.5 h-3.5 text-emerald-300 animate-pulse" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
              <span className="hidden sm:inline">{micOn ? 'Mic On' : 'Muted'}</span>
            </button>
          )}

          {/* Quick Co-Speakers Pill if any guest on mic */}
          {speakers && speakers.length > 0 && (
            <button
              type="button"
              onClick={onOpenTools}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-[10px] font-bold text-pink-300 active:scale-95 shadow-sm"
              title="Active Guest Speakers on Mic"
            >
              <Mic className="w-3 h-3 text-pink-400" />
              <span>{speakers.length}</span>
            </button>
          )}

          {/* Quick Host Live Tools button if Host */}
          {isHost && (
            <button
              type="button"
              onClick={onOpenTools}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-purple-600/60 to-pink-600/60 hover:from-purple-600 hover:to-pink-600 border border-purple-400/40 text-[11px] font-black text-white transition-all shadow-sm active:scale-95"
              title="Host Live Tools"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-200" />
              <span className="hidden sm:inline">Tools</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenTools}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white/80 active:scale-95"
            title="Settings & Tools"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {isHost && (
            <button
              type="button"
              onClick={onQuitPK || onEndPK}
              className="w-8 h-8 rounded-full bg-red-600/40 hover:bg-red-600/70 border border-red-500/40 transition-all flex items-center justify-center text-red-200 active:scale-95"
              title="Quit PK"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Host Incoming Mic Request Popup Banner */}
      {isHost && pendingMicRequester && onAcceptMicRequest && onDeclineMicRequest && (
        <MicRequestBanner
          requester={pendingMicRequester}
          onAccept={onAcceptMicRequest}
          onDecline={onDeclineMicRequest}
        />
      )}

      {/* 2. LIVE STAGE: Two Hosts' Live Videos (Takes 2 out of 4 parts = 50% of screen height) */}
      <div className="relative z-10 px-2 shrink-0 h-[48dvh] max-h-[50dvh] flex flex-col justify-center my-1">
        <div className="relative flex gap-2 h-full rounded-2xl overflow-hidden p-1 bg-gradient-to-r from-purple-950/40 via-black to-pink-950/40 border border-purple-500/30 shadow-2xl">
          {/* Left Host Feed (Host A) */}
          <div
            onClick={() => setSelectedSide('left')}
            className={`relative flex-1 h-full rounded-xl overflow-hidden bg-[#120d22] border-2 transition-all cursor-pointer ${
              selectedSide === 'left'
                ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                : 'border-white/10 hover:border-purple-500/50'
            }`}
          >
            {/* Live Video Mount Point (Agora/WebRTC video streams attach here) */}
            <div
              id="pk-video-left"
              className="absolute inset-0 w-full h-full overflow-hidden [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_div]:!w-full [&_div]:!h-full z-[1] transition-transform duration-300 ease-in-out"
              style={{
                transform: isMirrored && isHost && isSideA ? 'scaleX(-1)' : 'none',
                transformOrigin: 'center center',
              }}
            />

            {/* Ambient Background & Animated Poster Fallback */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center overflow-hidden">
              {leftHost.avatar ? (
                <img
                  src={getMediaUrl(leftHost.avatar)}
                  alt={leftHost.nickname}
                  className="w-full h-full object-cover scale-105 filter brightness-90"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-950 to-indigo-950 flex items-center justify-center font-black text-4xl text-purple-300">
                  {leftHost.nickname.charAt(0)}
                </div>
              )}
              {/* Pulsing voice aura behind avatar */}
              <div className="absolute w-28 h-28 rounded-full bg-purple-500/20 animate-ping pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />
            </div>

            {/* Top Badges: LIVE + Individual Viewers + Voice / Audio Speaking Waves */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-[9px] font-black text-white flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>

                {/* Animated Speaking / Audio wave equalizer (Hosts can talk to each other) */}
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 backdrop-blur-md"
                  title="Microphone Active"
                >
                  <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                  <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                </div>
              </div>

              {/* Host A Individual Viewer Count */}
              <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-bold text-white/90">
                👁 {formatViewerNumber(leftViewers)}
              </span>
            </div>

            {/* Bottom Overlay: Host Info & PK Score */}
            <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-purple-400 shrink-0 shadow-md">
                  {leftHost.avatar ? (
                    <img
                      src={getMediaUrl(leftHost.avatar)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-800 flex items-center justify-center text-xs font-bold text-white">
                      {leftHost.nickname.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate leading-tight drop-shadow">
                    {leftHost.nickname}
                  </p>
                  <span className="px-1.5 py-0.2 rounded bg-purple-500/30 border border-purple-400/30 text-[8px] text-purple-200 font-extrabold uppercase">
                    RANK {leftHost.level || 100}
                  </span>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline justify-between bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-purple-500/20">
                <span className="text-[9px] uppercase tracking-wider text-purple-300 font-extrabold">
                  PK SCORE
                </span>
                <span className="text-sm sm:text-base font-black text-purple-300 tabular-nums drop-shadow">
                  {leftScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Electric Centered "VS" Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-pink-600 border-2 border-white flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.85)]"
            >
              <Lightning className="absolute -top-2.5 text-yellow-300 w-5 h-5 drop-shadow animate-pulse" />
              <span className="text-lg sm:text-xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                VS
              </span>
              <Lightning className="absolute -bottom-2.5 text-yellow-300 w-5 h-5 drop-shadow animate-pulse" />
            </motion.div>
          </div>

          {/* Right Host Feed (Host B) */}
          <div
            onClick={() => setSelectedSide('right')}
            className={`relative flex-1 h-full rounded-xl overflow-hidden bg-[#1a0d1e] border-2 transition-all cursor-pointer ${
              selectedSide === 'right'
                ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)]'
                : 'border-white/10 hover:border-pink-500/50'
            }`}
          >
            {/* Live Video Mount Point */}
            <div
              id="pk-video-right"
              className="absolute inset-0 w-full h-full overflow-hidden [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_div]:!w-full [&_div]:!h-full z-[1] transition-transform duration-300 ease-in-out"
              style={{
                transform: isMirrored && isHost && !isSideA ? 'scaleX(-1)' : 'none',
                transformOrigin: 'center center',
              }}
            />

            {/* Ambient Background & Animated Poster Fallback */}
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center overflow-hidden">
              {rightHost.avatar ? (
                <img
                  src={getMediaUrl(rightHost.avatar)}
                  alt={rightHost.nickname}
                  className="w-full h-full object-cover scale-105 filter brightness-90"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-950 to-rose-950 flex items-center justify-center font-black text-4xl text-pink-300">
                  {rightHost.nickname.charAt(0)}
                </div>
              )}
              {/* Pulsing voice aura behind avatar */}
              <div className="absolute w-28 h-28 rounded-full bg-pink-500/20 animate-ping pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none" />
            </div>

            {/* Top Badges: LIVE + Individual Viewers + Voice / Audio Speaking Waves */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-bold text-white/90">
                👁 {formatViewerNumber(rightViewers)}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Speaking audio wave indicator */}
                <div
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 backdrop-blur-md"
                  title="Microphone Active"
                >
                  <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="w-1 h-3 rounded-full bg-emerald-400 animate-pulse [animation-delay:150ms]" />
                  <span className="w-1 h-2 rounded-full bg-emerald-400 animate-pulse [animation-delay:300ms]" />
                </div>

                <span className="px-2 py-0.5 rounded-full bg-red-600 text-[9px] font-black text-white flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>

            {/* Bottom Overlay: Host Info & PK Score */}
            <div className="absolute bottom-2 inset-x-2 z-10 pointer-events-none text-right">
              <div className="flex items-center justify-end gap-1.5 mb-1">
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate leading-tight drop-shadow">
                    {rightHost.nickname}
                  </p>
                  <span className="px-1.5 py-0.2 rounded bg-pink-500/30 border border-pink-400/30 text-[8px] text-pink-200 font-extrabold uppercase">
                    RANK {rightHost.level || 85}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-pink-400 shrink-0 shadow-md">
                  {rightHost.avatar ? (
                    <img
                      src={getMediaUrl(rightHost.avatar)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-pink-800 flex items-center justify-center text-xs font-bold text-white">
                      {rightHost.nickname.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline justify-between bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-pink-500/20">
                <span className="text-sm sm:text-base font-black text-pink-300 tabular-nums drop-shadow">
                  {rightScore.toLocaleString()}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-pink-300 font-extrabold">
                  PK SCORE
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PK SCORE LEVEL BAR (Dynamic Fill with Central Gap) */}
      <div className="relative z-10 px-3 py-1.5 shrink-0 bg-black/60 backdrop-blur-md border-y border-white/10 shadow-lg">
        {/* Dynamic Tug-of-War Level Gauge Progress Bar with Middle Gap */}
        <div className="relative h-4 rounded-full overflow-hidden bg-white/10 border border-white/15 p-0.5 shadow-inner">
          {/* Center Divider / Gap Marker */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-white/20 z-10 rounded-full" />

          {/* Animated Left Side Bar (Purple/Indigo) - Fills from Left edge */}
          {leftScore > 0 && (
            <motion.div
              initial={false}
              animate={{ width: `${leftFillPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.9)]"
            />
          )}

          {/* Animated Right Side Bar (Pink/Rose) - Fills from Right edge */}
          {rightScore > 0 && (
            <motion.div
              initial={false}
              animate={{ width: `${rightFillPct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-500 via-pink-500 to-fuchsia-400 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.9)]"
            />
          )}

          {/* Center Status / Score Indicators */}
          {leftScore === 0 && rightScore === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest px-2 py-0.2 rounded bg-black/40">
                0 : 0
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider px-2 py-0.2 rounded-full bg-black/60 border border-white/10 backdrop-blur-sm">
                {leadSide === 'tie'
                  ? 'TIED'
                  : `+${leadDiff.toLocaleString()}`}
              </span>
            </div>
          )}
        </div>

        {/* Bottom Rules / Status */}
        <div className="flex items-center justify-between mt-1 px-1 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-purple-300">
            <Swords className="w-3.5 h-3.5" />
            <span className="text-white/70">Score:</span> {leftScore.toLocaleString()}
          </span>

          {/* Central Lead Status Pill */}
          <span
            className={`px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md border ${
              leadSide === 'left'
                ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/40'
                : leadSide === 'right'
                ? 'bg-pink-600 text-white border-pink-400 shadow-pink-500/40'
                : 'bg-white/10 text-white/70 border-white/20'
            }`}
          >
            {leadSide === 'left'
              ? `${leftHost.nickname} LEADS`
              : leadSide === 'right'
              ? `${rightHost.nickname} LEADS`
              : 'TIED'}
          </span>

          <span className="flex items-center gap-1 text-pink-300">
            <span className="text-white/70">Score:</span> {rightScore.toLocaleString()}
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </span>
        </div>
      </div>

      {/* 4. DEDICATED SEPARATE TWO-HOST RECEIVED GIFTS SECTION */}
      <div className="relative z-10 h-28 max-h-32 shrink-0 px-2.5 py-1 flex flex-col overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-1 px-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <GiftIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-white">
              BATTLE GIFTS RECEIVED
            </span>
          </div>
          <span className="text-[10px] text-white/50 font-bold">
            Live Gift Comparison
          </span>
        </div>

        {/* Two Columns: Host A Gifts vs Host B Gifts */}
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-hidden">
          {/* LEFT HOST RECEIVED GIFTS PANEL */}
          <div className="flex flex-col h-full rounded-2xl bg-purple-950/25 border border-purple-500/30 backdrop-blur-md p-1.5 overflow-hidden shadow-sm">
            {/* Host A Header */}
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-purple-500/20 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-purple-400 shrink-0">
                  <img
                    src={getMediaUrl(leftHost.avatar || '')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-black text-purple-200 truncate">
                  {leftHost.nickname}
                </span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-purple-500/30 text-[9px] font-black text-purple-300 shrink-0">
                {leftGiftTotal > 0 ? `+${leftGiftTotal.toLocaleString()} 💎` : '0 💎'}
              </span>
            </div>

            {/* List of gifts received by Host A */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 no-scrollbar">
              {leftGifts.length > 0 ? (
                leftGifts.map((g, idx) => (
                  <motion.div
                    key={g.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-1 rounded-lg bg-purple-900/30 border border-purple-500/20 hover:bg-purple-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderGiftIcon(g.icon)}
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-white truncate leading-none">
                          {g.name} <span className="text-purple-300">x{g.count || 1}</span>
                        </p>
                        <span className="text-[7px] text-white/50 truncate block">
                          from {g.senderName || 'Viewer'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-purple-300 tabular-nums shrink-0">
                      +{(g.points || g.amount || 0).toLocaleString()}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-center p-1">
                  <span className="text-[10px] text-white/30 font-medium">Waiting for gifts…</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT HOST RECEIVED GIFTS PANEL */}
          <div className="flex flex-col h-full rounded-2xl bg-pink-950/25 border border-pink-500/30 backdrop-blur-md p-1.5 overflow-hidden shadow-sm">
            {/* Host B Header */}
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-pink-500/20 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-pink-400 shrink-0">
                  <img
                    src={getMediaUrl(rightHost.avatar || '')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-black text-pink-200 truncate">
                  {rightHost.nickname}
                </span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/30 text-[9px] font-black text-pink-300 shrink-0">
                {rightGiftTotal > 0 ? `+${rightGiftTotal.toLocaleString()} 💎` : '0 💎'}
              </span>
            </div>

            {/* List of gifts received by Host B */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 no-scrollbar">
              {rightGifts.length > 0 ? (
                rightGifts.map((g, idx) => (
                  <motion.div
                    key={g.id || idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-1 rounded-lg bg-pink-900/30 border border-pink-500/20 hover:bg-pink-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderGiftIcon(g.icon)}
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-white truncate leading-none">
                          {g.name} <span className="text-pink-300">x{g.count || 1}</span>
                        </p>
                        <span className="text-[7px] text-white/50 truncate block">
                          from {g.senderName || 'Viewer'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-pink-300 tabular-nums shrink-0">
                      +{(g.points || g.amount || 0).toLocaleString()}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-center p-1">
                  <span className="text-[10px] text-white/30 font-medium">Waiting for gifts…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. LIVE CHAT STREAM: Users can see comments and chat in real-time */}
      <div className="relative z-10 flex-1 min-h-[70px] overflow-y-auto px-3 py-1 space-y-1.5 no-scrollbar">
        {messages.length > 0 ? (
          messages.slice(-20).map((m, idx) => (
            <div
              key={idx}
              className="flex items-start gap-1.5 bg-black/45 backdrop-blur-md rounded-xl px-2.5 py-1 border border-white/5 max-w-[90%]"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0 mt-0.5">
                {m.avatar ? (
                  <img src={getMediaUrl(m.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-purple-900 flex items-center justify-center text-[9px] font-bold">
                    {m.nickname?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div className="text-[11px] leading-snug min-w-0">
                <span className="font-extrabold text-purple-300 mr-1">{m.nickname}:</span>
                <span className="text-white/90 break-words">{m.message}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center text-[10px] text-white/30 italic px-2 py-1">
            Say something to support your team…
          </div>
        )}
      </div>

      {/* 6. BOTTOM ACTION BAR: Supporting Selector + Send Gift + Chat Input + Live Tools Access + Likes */}
      <div className="relative z-20 px-3 py-2 bg-[#0d0818] border-t border-purple-500/20 shrink-0">
        {/* Supporting Host Selector */}
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="text-[11px] font-bold text-white/60">Supporting:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSide('left')}
              className={`px-3 py-0.5 rounded-full text-xs font-black transition-all ${
                selectedSide === 'left'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/50 border border-purple-400'
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              {leftHost.nickname}
            </button>
            <span className="text-white/30 text-xs">/</span>
            <button
              type="button"
              onClick={() => setSelectedSide('right')}
              className={`px-3 py-0.5 rounded-full text-xs font-black transition-all ${
                selectedSide === 'right'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/50 border border-pink-400'
                  : 'bg-white/10 text-white/60 hover:bg-white/15'
              }`}
            >
              {rightHost.nickname}
            </button>
          </div>
        </div>

        {/* Input & Action Strip */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Send Gift Button */}
          <button
            type="button"
            onClick={() => {
              const target = selectedSide === 'left' ? leftHost.userId : rightHost.userId;
              onSendGift(target, selectedSide);
            }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg shadow-pink-500/30 shrink-0"
            title={`Send Gift to ${selectedSide === 'left' ? leftHost.nickname : rightHost.nickname}`}
          >
            <GiftIcon className="w-5 h-5 animate-bounce" />
          </button>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Send message to ${
                selectedSide === 'left' ? leftHost.nickname : rightHost.nickname
              }’s team…`}
              className="w-full h-10 px-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none text-xs text-white placeholder-white/40"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="w-10 h-10 rounded-2xl bg-purple-600/40 hover:bg-purple-600 text-purple-200 hover:text-white disabled:opacity-30 transition-all flex items-center justify-center shrink-0"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </form>

          {/* Host Live Tools Access Button (Opens full tools sheet: Mic, Flip cam, Beauty, Audio, etc.) */}
          {isHost && (
            <button
              type="button"
              onClick={onOpenTools}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 active:scale-95 transition-all flex items-center justify-center text-white border border-purple-400/40 shadow-md shadow-purple-600/30 shrink-0"
              title="Host Live Tools (Mic, Camera, Beauty, Settings)"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Audience Request Mic / Co-host Button (like normal live) */}
          {!isHost && onRequestMic && (
            <button
              type="button"
              onClick={() => {
                if (isSpeaker) {
                  onToggleMic?.();
                } else if (!micRequestPending) {
                  onRequestMic();
                }
              }}
              className={`w-10 h-10 rounded-2xl active:scale-95 transition-all flex flex-col items-center justify-center shrink-0 border ${
                isSpeaker
                  ? micOn
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/30'
                    : 'bg-red-500/25 border-red-400 text-red-300'
                  : micRequestPending
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-gradient-to-tr from-pink-600/40 to-purple-600/40 border-pink-400/40 text-pink-200 hover:text-white'
              }`}
              title={
                isSpeaker
                  ? micOn ? 'Speaking on Mic (Tap to mute)' : 'Muted (Tap to unmute)'
                  : micRequestPending ? 'Mic Request Pending' : 'Request to Speak on Mic'
              }
            >
              {isSpeaker ? (
                micOn ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span className="text-[7px] font-black uppercase tracking-tighter leading-none mt-0.5">
                {isSpeaker ? (micOn ? 'ON' : 'OFF') : micRequestPending ? 'WAIT' : 'MIC'}
              </span>
            </button>
          )}

          {/* Like / Heart Button (Tapping sends +100 PK score to selected host once per battle) */}
          <button
            type="button"
            onClick={handleHeartClick}
            className={`w-10 h-10 rounded-2xl active:scale-90 transition-all flex flex-col items-center justify-center shrink-0 border ${
              hasGivenPkLove
                ? 'bg-rose-500/25 border-rose-400 text-rose-300 shadow-md shadow-rose-500/30'
                : 'bg-white/5 hover:bg-white/10 text-rose-400 border-white/5'
            }`}
            title={hasGivenPkLove ? 'Love Points Sent (+100 PK)' : 'Tap to send +100 PK Love Points!'}
          >
            <Heart className={`w-4 h-4 fill-current ${hasGivenPkLove ? 'animate-bounce' : ''}`} />
            <span className="text-[8px] font-bold text-white/70 leading-none">
              {hasGivenPkLove ? '+100' : (likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount)}
            </span>
          </button>

          {/* Share */}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center text-white/70 shrink-0 border border-white/5"
              title="Share PK Stream"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 6. VICTORY / SETTLEMENT OVERLAY AT FINISH */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl p-6 text-center"
          >
            <motion.div
              initial={{ y: -30 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="flex flex-col items-center max-w-xs"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.7)] mb-4">
                <Trophy className="w-10 h-10 text-black" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-wider uppercase mb-1 drop-shadow">
                {winner === 'tie'
                  ? 'PK BATTLE TIED!'
                  : winner === 'left'
                  ? `${leftHost.nickname} WINS!`
                  : `${rightHost.nickname} WINS!`}
              </h2>

              <p className="text-xs text-purple-300 font-bold mb-6">
                Final Score: {leftScore.toLocaleString()} vs {rightScore.toLocaleString()}
              </p>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={onQuitPK}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-black text-sm text-white shadow-xl shadow-purple-600/40 active:scale-95 transition-all"
                >
                  Back to Normal Live {autoCloseCountdown !== null ? `(${autoCloseCountdown}s)` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
