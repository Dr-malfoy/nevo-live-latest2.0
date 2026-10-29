import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiCaretLeftBold as ArrowLeft,
  PiVideoCameraFill as Video,
  PiVideoCameraSlashFill as VideoOff,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiGameControllerFill as Gamepad2,
  PiUploadSimpleBold as Upload,
  PiArrowsClockwiseBold as FlipCamera,
  PiSparkleFill as Sparkles,
  PiShieldCheckFill as ShieldCheck,
  PiXBold as CloseIcon,
  PiBroadcastBold as BroadcastIcon,
  PiCameraBold as CameraIcon,
  PiCheckBold as CheckIcon,
  PiInfoBold as InfoIcon,
  PiBellFill as BellIcon,
  PiTrashBold as TrashIcon,
  PiUsersBold as UsersIcon,
  PiLightningFill as ZapIcon,
  PiMusicNotesFill as MusicIcon,
  PiFireBold as FireIcon,
} from 'react-icons/pi';
import { VerificationGateModal } from '../components/ui';
import { streamsApi, uploadApi } from '../api';
import { roomsApi } from '../api/rooms.api';
import { useAuthStore, useUIStore } from '../stores';
import { canUseLiveFeatures } from '../services/verification';
import { getMediaUrl } from '../lib/media';
import { GenderSelectionModal } from '../components/user';

interface FilterPreset {
  id: string;
  name: string;
  css: string;
  badge?: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'natural', name: 'Original', css: 'none' },
  { id: 'glow', name: 'Studio Glow', css: 'contrast(1.08) brightness(1.06) saturate(1.12)', badge: 'POPULAR' },
  { id: 'warm', name: 'Warm Sunset', css: 'sepia(0.12) saturate(1.18) brightness(1.04)' },
  { id: 'vivid', name: 'Vivid Pop', css: 'saturate(1.28) contrast(1.06)' },
  { id: 'silk', name: 'Soft Radiant', css: 'brightness(1.07) contrast(0.96) saturate(1.08)' },
];

const STREAM_MODES = [
  {
    value: 'video' as const,
    label: 'Video Live',
    icon: Video,
    tag: 'HD 1080P',
    subtitle: 'Camera broadcast with real-time gifts & multi-mic',
  },
  {
    value: 'voice' as const,
    label: 'Voice Party',
    icon: Mic,
    tag: '16 SEATS',
    subtitle: 'Multi-seat social audio room with interactive sound',
  },
  {
    value: 'game' as const,
    label: 'Game Live',
    icon: Gamepad2,
    tag: 'HOT',
    subtitle: 'Stream gameplay, host mini-games & earn diamonds',
  },
];

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  video: [
    'Singing & Chill Vibes 🎤',
    'Late Night Talks 🌙',
    'PK Battle Challenge ⚔️',
    'Q&A & Make Friends ✨',
    'VIP Party Lounge 💎',
  ],
  voice: [
    '16-Seat Social Club 🎙️',
    'Music Jam & Karaoke 🎶',
    'Truth or Dare Games 🎲',
    'Global Chill Lounge 🌍',
    'Midnight Storytelling ☕',
  ],
  game: [
    'Live Gaming Showdown 🎮',
    'Playing with Fans 🕹️',
    'Aviator High Stakes ✈️',
    'Road to Top Ranking 🏆',
    'Casual Arcade Night 🎉',
  ],
};

export const GoLive: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const paramType = searchParams.get('type');
  const [type, setType] = useState<'video' | 'voice' | 'game'>(
    paramType === 'voice' || paramType === 'party' ? 'voice' : paramType === 'game' ? 'game' : 'video'
  );

  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [notifyFollowers, setNotifyFollowers] = useState(true);

  // Camera preview controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string>('glow');
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  useEffect(() => {
    const t = searchParams.get('type');
    if (t === 'party' || t === 'voice') {
      setType('voice');
    } else if (t === 'game') {
      setType('game');
    }
  }, [searchParams]);

  // Set default title suggestion if title is empty
  useEffect(() => {
    if (!title) {
      if (type === 'voice') {
        setTitle(`${user?.nickname || 'Creator'}'s Voice Lounge 🎙️`);
      } else if (type === 'game') {
        setTitle(`Gaming Live with ${user?.nickname || 'Me'} 🎮`);
      } else {
        setTitle(`Live with ${user?.nickname || 'Me'} ✨`);
      }
    }
  }, [type, user?.nickname]);

  // Manage camera preview stream
  useEffect(() => {
    let isCancelled = false;

    const stopExistingStream = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (type === 'voice' || !cameraActive) {
      stopExistingStream();
      return;
    }

    const startCamera = async () => {
      stopExistingStream();
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setHasCameraAccess(false);
          return;
        }

        const isPortrait = typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true;
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: isPortrait ? { ideal: 1080, min: 720 } : { ideal: 1920, min: 1080 },
              height: isPortrait ? { ideal: 1920, min: 1080 } : { ideal: 1080, min: 720 },
              frameRate: { ideal: 30, max: 30 },
            },
            audio: false, // local preview only, prevent feedback loop
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: isPortrait ? { ideal: 720, min: 480 } : { ideal: 1280, min: 640 },
              height: isPortrait ? { ideal: 1280, min: 640 } : { ideal: 720, min: 480 },
              frameRate: { ideal: 30, max: 30 },
            },
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCameraAccess(true);
      } catch (err) {
        console.warn('Camera preview not available:', err);
        if (!isCancelled) {
          setHasCameraAccess(false);
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopExistingStream();
    };
  }, [type, cameraActive, facingMode]);

  const toggleCamera = () => {
    setCameraActive((prev) => !prev);
  };

  const toggleMic = () => {
    setMicActive((prev) => !prev);
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleSelectThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be under 5MB', 'error');
        return;
      }
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const clearThumbnail = () => {
    setThumbnail(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const handleGoLive = async () => {
    if (!title.trim()) {
      showToast('Please enter a stream title', 'warning');
      return;
    }

    // Mandatory Gender check
    if (!user?.gender || user.gender === 'unspecified') {
      setShowGenderModal(true);
      return;
    }

    // Live Face Verification gate for going live
    if (!canUseLiveFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    setLoading(true);
    let coverUrl = '';
    if (thumbnail) {
      try {
        coverUrl = await uploadApi.upload(thumbnail);
      } catch (err) {
        showToast('Failed to upload thumbnail', 'error');
        setLoading(false);
        return;
      }
    }

    try {
      if (type === 'voice') {
        const { data } = await roomsApi.create({
          name: title.trim(),
          seatCount: 16,
        });
        if (data.success && data.data?._id) {
          showToast('Party room created!', 'success');
          navigate(`/party/${data.data._id}`, { replace: true });
          return;
        }
      }

      // One user = one active live session. Check before creating a new one.
      const active = await streamsApi.getMyActiveStream();
      if (active.data.success && active.data.data?._id) {
        showToast('You are already live on another session', 'info');
        navigate(`/live/${active.data.data._id}`, { replace: true });
        return;
      }

      const { data } = await streamsApi.createStream({
        title: title.trim(),
        type,
        category: type === 'game' ? 'game' : 'talk',
        cover: coverUrl,
      });
      if (data.success && data.data) {
        navigate(`/live/${data.data._id}`, { replace: true });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start stream', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeFilter = FILTER_PRESETS.find((f) => f.id === activeFilterId) || FILTER_PRESETS[0];

  return (
    <div className="relative min-h-[100dvh] bg-[#090A10] text-white flex flex-col justify-between max-w-lg mx-auto overflow-x-hidden selection:bg-[#ff2851] selection:text-white">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-[#ff2851]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-0 w-80 h-80 bg-gradient-to-tl from-[#5B5BF5]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3.5 backdrop-blur-xl bg-black/40 border-b border-white/[0.08]">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 transition-all text-white border border-white/[0.08]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[13px] font-bold tracking-wider uppercase text-white/90">
              Live Studio
            </span>
          </div>
          <span className="text-[10px] text-white/50 tracking-tight">
            High Fidelity • Low Latency
          </span>
        </div>

        <button
          onClick={() => setShowGuidelines(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 transition-all text-white/80 hover:text-white border border-white/[0.08]"
          title="Streaming Guidelines"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </button>
      </header>

      {/* ── Main Studio Content ───────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Stream Mode Segmented Switcher */}
        <section aria-label="Broadcast Modes">
          <div className="grid grid-cols-3 p-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md">
            {STREAM_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = type === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => setType(mode.value)}
                  className={`relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-white/60 hover:text-white/90'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeModePill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#ff4f7a] to-[#ff2851] shadow-[0_4px_16px_rgba(255,40,81,0.35)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </span>
                  <span
                    className={`relative z-10 mt-0.5 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? 'bg-black/30 text-white' : 'text-white/40'
                    }`}
                  >
                    {mode.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Interactive Viewport / Camera Preview ──────────────────── */}
        <section className="relative rounded-3xl overflow-hidden border border-white/[0.12] bg-[#12131C] shadow-2xl">
          {type === 'voice' ? (
            /* Voice Party Stage Visualizer */
            <div className="relative aspect-[16/10] sm:aspect-[16/9] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#161828] via-[#10111D] to-[#0A0B13] overflow-hidden">
              {/* Concentric audio waves */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 rounded-full border border-[#ff2851]/10 animate-ping opacity-25" />
                <div className="w-48 h-48 rounded-full border border-[#5B5BF5]/20 animate-pulse" />
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#ff2851]/20 to-[#5B5BF5]/20 blur-xl" />
              </div>

              {/* Host Avatar or Mic Icon */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-3">
                  <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#ff2851] via-[#5B5BF5] to-[#2AB6E4] shadow-[0_0_24px_rgba(255,40,81,0.4)]">
                    <img
                      src={getMediaUrl(user?.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={user?.nickname || 'Host'}
                      className="w-full h-full object-cover rounded-full"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#ff2851] flex items-center justify-center border-2 border-[#12131C] text-white shadow-md">
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>{user?.nickname || 'Party Host'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black">
                    16-SEAT
                  </span>
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Ultra HD Social Audio • Room Seats Ready
                </p>

                {/* Animated Voice Equalizer */}
                <div className="flex items-end gap-1 h-5 mt-4">
                  {[40, 75, 100, 60, 85, 45, 90, 65, 30].map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-1 bg-gradient-to-t from-[#ff2851] to-[#ff7b95] rounded-full"
                      animate={{ height: ['20%', `${h}%`, '20%'] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8 + (i % 3) * 0.2,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Top-right room badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Audio Room</span>
              </div>
            </div>
          ) : (
            /* Video / Game Camera Feed Viewport */
            <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-black overflow-hidden group">
              {cameraActive && hasCameraAccess !== false ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: activeFilter.css }}
                />
              ) : (
                /* Fallback avatar preview when camera is paused */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#181926] via-[#10111a] to-[#0a0a10] p-6">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 p-1 flex items-center justify-center mb-3">
                    <img
                      src={getMediaUrl(user?.avatar) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-full h-full object-cover rounded-full opacity-60"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <p className="text-sm font-semibold text-white/80">Camera is Paused</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {hasCameraAccess === false
                      ? 'Camera permission denied or camera unavailable'
                      : 'Tap camera button below to enable preview'}
                  </p>
                  {hasCameraAccess !== false && (
                    <button
                      onClick={toggleCamera}
                      className="mt-3 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-all"
                    >
                      Enable Camera Preview
                    </button>
                  )}
                </div>
              )}

              {/* Top HUD overlay */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-[11px] font-bold text-white shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-red-500 -ml-3.5" />
                  <span className="ml-1 tracking-wider text-[10px]">PREVIEW</span>
                </div>
                <div className="px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-[10px] font-semibold text-white/80 border border-white/10">
                  1080P • 60FPS
                </div>
              </div>

              {/* Floating Camera / Mic Control Strip */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <button
                  onClick={flipCamera}
                  className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 active:scale-95 flex items-center justify-center text-white/90 border border-white/10 shadow-md transition-all"
                  title="Flip Camera"
                >
                  <FlipCamera className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleCamera}
                  className={`w-8 h-8 rounded-full backdrop-blur-md active:scale-95 flex items-center justify-center border shadow-md transition-all ${
                    cameraActive
                      ? 'bg-black/60 hover:bg-black/80 text-white/90 border-white/10'
                      : 'bg-red-500/80 text-white border-red-400'
                  }`}
                  title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleMic}
                  className={`w-8 h-8 rounded-full backdrop-blur-md active:scale-95 flex items-center justify-center border shadow-md transition-all ${
                    micActive
                      ? 'bg-black/60 hover:bg-black/80 text-white/90 border-white/10'
                      : 'bg-red-500/80 text-white border-red-400'
                  }`}
                  title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setShowFilterPicker((prev) => !prev)}
                  className={`w-8 h-8 rounded-full backdrop-blur-md active:scale-95 flex items-center justify-center border shadow-md transition-all ${
                    showFilterPicker
                      ? 'bg-[#ff2851] text-white border-[#ff2851]'
                      : 'bg-black/60 hover:bg-black/80 text-amber-300 border-white/10'
                  }`}
                  title="Beauty Filters"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom HUD: Mic visualizer & Active filter indicator */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white/90">
                  <Mic className={`w-3 h-3 ${micActive ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className="text-[10px] font-medium">
                    {micActive ? 'Mic Active' : 'Mic Muted'}
                  </span>
                  {micActive && (
                    <div className="flex items-end gap-0.5 h-3 ml-1">
                      {[40, 90, 60, 100, 50].map((h, i) => (
                        <motion.span
                          key={i}
                          className="w-0.5 bg-emerald-400 rounded-full"
                          animate={{ height: ['20%', `${h}%`, '20%'] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6 + i * 0.1,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {activeFilter.id !== 'natural' && (
                  <div className="px-2 py-0.5 rounded-full bg-[#ff2851]/80 backdrop-blur-md text-[10px] font-semibold text-white">
                    ✨ {activeFilter.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Beauty Filter Tray (Sliding) */}
          <AnimatePresence>
            {showFilterPicker && type !== 'voice' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="p-3 bg-black/90 backdrop-blur-xl border-t border-white/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/80 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Beauty & Color Enhancements</span>
                  </span>
                  <button
                    onClick={() => setShowFilterPicker(false)}
                    className="text-white/50 hover:text-white text-xs"
                  >
                    Done
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {FILTER_PRESETS.map((f) => {
                    const isSel = activeFilterId === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilterId(f.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isSel
                            ? 'bg-gradient-to-r from-[#ff4f7a] to-[#ff2851] text-white shadow-md font-semibold'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {f.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Broadcast Title & Quick Topic Engine ──────────────────── */}
        <section className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5 uppercase tracking-wider">
              <BroadcastIcon className="w-4 h-4 text-[#ff2851]" />
              <span>Broadcast Title</span>
            </label>
            <span className="text-[11px] font-mono text-white/40">
              {title.length}/60
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={60}
              placeholder="What's your stream about? (e.g. Singing & Chill)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-4 pr-10 rounded-xl bg-black/40 border border-white/10 focus:border-[#ff2851] focus:ring-2 focus:ring-[#ff2851]/20 text-sm text-white placeholder-white/30 outline-none transition-all"
            />
            {title && (
              <button
                type="button"
                onClick={() => setTitle('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick topic suggestion pills */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-white/50 flex items-center gap-1">
              <FireIcon className="w-3 h-3 text-amber-400" />
              <span>Trending topic ideas:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(TOPIC_SUGGESTIONS[type] || TOPIC_SUGGESTIONS.video).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTitle(tag)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-white/80 hover:text-white border border-white/[0.05] transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cover / Thumbnail Studio ──────────────────────────────── */}
        <section className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <input
            type="file"
            ref={thumbnailInputRef}
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            onChange={handleSelectThumbnail}
          />

          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                <CameraIcon className="w-4 h-4 text-[#2AB6E4]" />
                <span>Stream Cover Photo</span>
              </h4>
              <p className="text-[11px] text-white/50 mt-0.5">
                High-quality covers attract up to 300% more audience clicks
              </p>
            </div>
            {thumbnailPreview && (
              <button
                onClick={clearThumbnail}
                className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-medium"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Thumbnail Box */}
            <div
              onClick={() => thumbnailInputRef.current?.click()}
              className="relative w-28 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40 hover:border-[#ff2851] cursor-pointer group flex-shrink-0 transition-all shadow-md"
            >
              {thumbnailPreview ? (
                <>
                  <img
                    src={getMediaUrl(thumbnailPreview)}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-medium">
                    Change
                  </div>
                </>
              ) : user?.avatar ? (
                <>
                  <img
                    src={getMediaUrl(user.avatar)}
                    alt="Profile fallback"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-black/30">
                    <Upload className="w-4 h-4 text-white mb-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-[9px] text-white/90 font-medium">Add Cover</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/40">
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[9px]">Upload</span>
                </div>
              )}
            </div>

            {/* Explanatory CTA */}
            <div className="flex-1">
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-98 text-xs font-semibold text-white/90 border border-white/10 flex items-center justify-center gap-1.5 transition-all"
              >
                <Upload className="w-4 h-4 text-[#ff4f7a]" />
                <span>{thumbnailPreview ? 'Replace Photo' : 'Upload Custom Cover'}</span>
              </button>
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/40">
                <CheckIcon className="w-3 h-3 text-emerald-400" />
                <span>Supports JPG, PNG (Max 5MB)</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Audience & Broadcast Preferences ─────────────────────── */}
        <section className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#ff2851]/15 flex items-center justify-center text-[#ff2851]">
                <BellIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">Notify Followers</p>
                <p className="text-[10px] text-white/50">Send push notification to all fans</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNotifyFollowers((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 border border-white/10 ${
                notifyFollowers ? 'bg-gradient-to-r from-[#ff4f7a] to-[#ff2851]' : 'bg-white/10'
              }`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ x: notifyFollowers ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </section>
      </main>

      {/* ── Bottom Sticky Launch Footer ───────────────────────────────── */}
      <footer className="sticky bottom-0 z-30 p-4 backdrop-blur-2xl bg-black/70 border-t border-white/[0.08] space-y-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          onClick={handleGoLive}
          disabled={loading || !title.trim()}
          className={`w-full h-13 py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-all duration-200 ${
            !title.trim()
              ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
              : 'bg-gradient-to-r from-[#ff4f7a] via-[#ff2851] to-[#e61e4d] text-white shadow-[0_8px_32px_rgba(255,40,81,0.45)] hover:shadow-[0_10px_36px_rgba(255,40,81,0.6)] border border-white/20'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Preparing Broadcast Studio...</span>
            </div>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-85" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-[15px] font-extrabold uppercase tracking-wider">
                {type === 'voice'
                  ? 'Start Voice Party'
                  : type === 'game'
                  ? 'Launch Game Stream'
                  : 'Start Live Broadcast'}
              </span>
            </>
          )}
        </motion.button>

        <p className="text-center text-[10px] text-white/40 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Stream safe. Zero tolerance for inappropriate content.</span>
        </p>
      </footer>

      {/* ── Community Guidelines Modal ──────────────────────────────── */}
      <AnimatePresence>
        {showGuidelines && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-[#141522] border border-white/10 p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Streamer Guidelines</h3>
                </div>
                <button
                  onClick={() => setShowGuidelines(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-white/75">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <p>
                    <strong className="text-white">Be Respectful & Welcoming:</strong> Keep your room safe, positive, and inclusive for all viewers.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <p>
                    <strong className="text-white">Prohibited Content:</strong> Violence, hate speech, explicit nudity, copyright infringement, and scams are strictly forbidden.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#ff2851]/20 text-[#ff2851] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <p>
                    <strong className="text-white">Account Safety:</strong> Violations will result in temporary suspension or permanent live broadcasting ban.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowGuidelines(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff4f7a] to-[#ff2851] text-white text-xs font-bold uppercase tracking-wider"
              >
                I Understand & Agree
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Required Business Gate Modals ────────────────────────────── */}
      <VerificationGateModal isOpen={showGate} onClose={() => setShowGate(false)} type="face" />
      <GenderSelectionModal
        isOpen={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        onSuccess={() => handleGoLive()}
        title="Gender Required to Go Live"
        reason="Please select your gender before starting a live stream. Gender selection is mandatory and cannot be changed for 60 days."
      />
    </div>
  );
};
