import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiVideoCameraFill as Video,
  PiVideoCameraSlashFill as VideoOff,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiArrowsClockwiseBold as Repeat,
  PiMagicWandFill as Wand2,
  PiShareNetworkFill as Share2,
  PiGiftFill as Gift,
  PiFlagFill as Flag,
  PiStarFill as Star,
  PiGearSixFill as Gear,
  PiBroadcastFill as Broadcast,
  PiSlidersBold as Sliders,
  PiTrophyFill as Trophy,
  PiCoinsFill as Coins,
  PiShoppingBagFill as ShoppingBag,
  PiDiamondFill as Diamond,
  PiBackpackFill as Backpack,
  PiStorefrontFill as Storefront,
  PiCubeFill as Cube,
  PiChatCircleDotsFill as ChatDots,
  PiHeartFill as Heart,
  PiWaveformBold as Waveform,
  PiSwordBold as Swords,
} from 'react-icons/pi';
import { MouthIcon, MouthOffIcon } from './MouthIcons';
import { useUIStore } from '../../stores';
import { useNavigate } from 'react-router-dom';

export interface LiveToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  videoEnabled?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  isSpeaker?: boolean;
  micRequestPending?: boolean;
  mirrorOn?: boolean;
  noiseReductionOn?: boolean;
  speakers?: import('./TopGifterSeats').LiveSpeakerItem[];
  pendingMicRequester?: import('./MicRequestBanner').MicRequester | null;
  onAcceptMicRequest?: (requester: import('./MicRequestBanner').MicRequester) => void;
  onDeclineMicRequest?: (requester: import('./MicRequestBanner').MicRequester) => void;
  onMuteSpeaker?: (userId: string, isMuted: boolean) => void;
  onKickSpeaker?: (userId: string) => void;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onRequestMic?: () => void;
  onSwitchCamera?: () => void;
  onToggleFilters?: () => void;
  onOpenGift?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onOpenLiveData?: () => void;
  onOpenMessenger?: () => void;
  onOpenBeauty?: () => void;
  onToggleMirror?: () => void;
  onToggleNoiseReduction?: () => void;
  onOpenPK?: () => void;
  onOpenPKRank?: () => void;
  onOpenRewards?: () => void;
  onOpenBag?: () => void;
  onOpenStore?: () => void;
  onOpenGiftGallery?: () => void;
  onOpenVIP?: () => void;
  onOpenLuckyBox?: () => void;
  onOpenAdmins?: () => void;
}

interface ToolButtonProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  active?: boolean;
  onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  label,
  icon,
  badge,
  badgeColor,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-all text-center select-none"
    >
      <div
        className={`relative w-13 h-13 rounded-2xl flex items-center justify-center transition-all shadow-md ${
          active === false
            ? 'bg-red-500/15 border border-red-500/30 text-red-400'
            : active === true
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
            : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
        }`}
        style={{ width: '3.25rem', height: '3.25rem' }}
      >
        {icon}
        {badge && (
          <span
            className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black text-white shadow ${
              badgeColor || 'bg-pink-500'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="text-[11px] text-white/90 font-medium leading-tight truncate w-16">
        {label}
      </span>
    </button>
  );
};

export const LiveToolsSheet: React.FC<LiveToolsSheetProps> = ({
  isOpen,
  onClose,
  isHost,
  videoEnabled = true,
  cameraOn = true,
  micOn = true,
  isSpeaker = false,
  micRequestPending = false,
  mirrorOn = false,
  noiseReductionOn = true,
  speakers = [],
  pendingMicRequester = null,
  onAcceptMicRequest,
  onDeclineMicRequest,
  onMuteSpeaker,
  onKickSpeaker,
  onToggleCamera,
  onToggleMic,
  onRequestMic,
  onSwitchCamera,
  onToggleFilters,
  onOpenGift,
  onShare,
  onReport,
  onOpenLiveData,
  onOpenMessenger,
  onOpenBeauty,
  onToggleMirror,
  onToggleNoiseReduction,
  onOpenPK,
  onOpenPKRank,
  onOpenRewards,
  onOpenBag,
  onOpenStore,
  onOpenGiftGallery,
  onOpenVIP,
  onOpenLuckyBox,
  onOpenAdmins,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-lg bg-[#141423]/95 border-t border-white/15 rounded-t-[30px] flex flex-col max-h-[85vh] shadow-2xl animate-slide-up pb-safe text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-13 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse shadow-sm shadow-pink-500" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {isHost ? 'Live Tools & Controls' : 'Live Actions'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Tools Sections matching Image 1 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Section 1: Host Tools (Only shown for Host) */}
          {isHost && (
            <div>
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
                Host Tools
              </span>
              <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                <ToolButton
                  id="live_data"
                  label="Live Data"
                  icon={<Star className="w-6 h-6 text-amber-400 fill-current" />}
                  badge="HOT"
                  badgeColor="bg-amber-500"
                  onClick={() => {
                    onClose();
                    onOpenLiveData?.();
                  }}
                />
              </div>

              {/* Guest Mic Access & Active Co-Speakers Manager */}
              <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                    <MouthIcon className="w-3.5 h-3.5 text-pink-400" />
                    Mic Access & Co-Speakers ({speakers?.length || 0})
                  </span>
                  {speakers && speakers.length > 0 && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live on Mic
                    </span>
                  )}
                </div>

                {/* Pending Mic Requester alert inside tools */}
                {pendingMicRequester && onAcceptMicRequest && onDeclineMicRequest && (
                  <div className="bg-gradient-to-r from-pink-950/60 to-purple-950/60 border border-pink-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-black/40 border border-pink-400 shrink-0">
                        {pendingMicRequester.avatar ? (
                          <img src={pendingMicRequester.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                            {pendingMicRequester.nickname?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{pendingMicRequester.nickname}</p>
                        <p className="text-[10px] text-pink-300">Requested to speak on mic</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAcceptMicRequest(pendingMicRequester)}
                        className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-bold shadow-md shadow-pink-600/30"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineMicRequest(pendingMicRequester)}
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-[11px] font-bold"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Speakers on Mic */}
                {speakers && speakers.length > 0 ? (
                  <div className="space-y-1.5">
                    {speakers.map((sp) => (
                      <div
                        key={sp.userId}
                        className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-black/50 border border-purple-400 shrink-0">
                            {sp.avatar ? (
                              <img src={sp.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-purple-200">
                                {sp.nickname?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white truncate">{sp.nickname}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onMuteSpeaker && (
                            <button
                              type="button"
                              onClick={() => onMuteSpeaker(sp.userId, !sp.isMuted)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                                sp.isMuted
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                              title={sp.isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                            >
                              {sp.isMuted ? <MouthOffIcon className="w-3.5 h-3.5" /> : <MouthIcon className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {onKickSpeaker && (
                            <button
                              type="button"
                              onClick={() => onKickSpeaker(sp.userId)}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600/30 text-white/70 hover:text-red-200 border border-white/10 text-xs font-bold transition-all"
                              title="Remove from Mic"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !pendingMicRequester && (
                    <p className="text-[11px] text-white/40 italic py-1">
                      No guest audience on mic currently. Audience can request mic during live.
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Section 2: Basic Tools */}
          <div>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
              Basic Tools
            </span>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              <ToolButton
                id="message"
                label="Message"
                icon={<ChatDots className="w-6 h-6 text-sky-400" />}
                badge="NEW"
                badgeColor="bg-red-500"
                onClick={() => {
                  onClose();
                  onOpenMessenger?.();
                }}
              />

              {videoEnabled && onToggleCamera && (
                <ToolButton
                  id="video"
                  label="Video"
                  icon={cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  badge={cameraOn ? 'On' : 'Off'}
                  badgeColor={cameraOn ? 'bg-emerald-500' : 'bg-red-500'}
                  active={cameraOn}
                  onClick={() => onToggleCamera()}
                />
              )}

              {isHost && onToggleMic && (
                <ToolButton
                  id="host_mic"
                  label={micOn ? 'Mic ON' : 'Mic OFF'}
                  icon={micOn ? <Mic className="w-6 h-6 text-emerald-400" /> : <MicOff className="w-6 h-6 text-red-400" />}
                  badge={micOn ? 'ON' : 'OFF'}
                  badgeColor={micOn ? 'bg-emerald-500' : 'bg-red-500'}
                  active={micOn}
                  onClick={() => onToggleMic()}
                />
              )}

              {videoEnabled && onSwitchCamera && (
                <ToolButton
                  id="switch_camera"
                  label="Switch Camera"
                  icon={<Repeat className="w-6 h-6 text-cyan-300" />}
                  onClick={() => {
                    onSwitchCamera();
                    showToast('Camera switched', 'info');
                  }}
                />
              )}

              <ToolButton
                id="beauty"
                label="Beauty"
                icon={<Wand2 className="w-6 h-6 text-fuchsia-400" />}
                badge="PRO"
                badgeColor="bg-gradient-to-r from-purple-500 to-pink-500"
                onClick={() => {
                  onClose();
                  onOpenBeauty?.();
                }}
              />

              <ToolButton
                id="mirror"
                label="Mirror"
                icon={<Repeat className="w-6 h-6 text-indigo-400 rotate-90" />}
                badge={mirrorOn ? 'On' : 'Off'}
                badgeColor={mirrorOn ? 'bg-emerald-500' : 'bg-slate-600'}
                active={mirrorOn}
                onClick={() => {
                  onToggleMirror?.();
                }}
              />

              <ToolButton
                id="share"
                label="Share"
                icon={<Share2 className="w-6 h-6 text-cyan-400" />}
                onClick={() => {
                  onClose();
                  onShare?.();
                }}
              />

              <ToolButton
                id="noise_reduction"
                label="Noise Reduction"
                icon={<Waveform className="w-6 h-6 text-emerald-400" />}
                badge={noiseReductionOn ? 'On' : 'Off'}
                badgeColor={noiseReductionOn ? 'bg-emerald-500' : 'bg-slate-600'}
                active={noiseReductionOn}
                onClick={() => {
                  onToggleNoiseReduction?.();
                }}
              />

              {!isHost && (
                <ToolButton
                  id="live_data_viewer"
                  label="Live Data"
                  icon={<Star className="w-6 h-6 text-amber-400 fill-current" />}
                  badge="HOT"
                  badgeColor="bg-amber-500"
                  onClick={() => {
                    onClose();
                    onOpenLiveData?.();
                  }}
                />
              )}

              {!isHost && (
                <ToolButton
                  id="viewer_mic"
                  label={isSpeaker ? (micOn ? 'Mic ON' : 'Mic OFF') : (micRequestPending ? 'Requested' : 'Request Mic')}
                  icon={isSpeaker ? (micOn ? <MouthIcon className="w-6 h-6" /> : <MouthOffIcon className="w-6 h-6" />) : <MouthIcon className="w-6 h-6" />}
                  badge={isSpeaker ? (micOn ? 'ON' : 'OFF') : (micRequestPending ? 'WAIT' : 'MIC')}
                  badgeColor={isSpeaker ? (micOn ? 'bg-emerald-500' : 'bg-red-500') : (micRequestPending ? 'bg-amber-500' : 'bg-pink-500')}
                  active={isSpeaker ? micOn : micRequestPending}
                  onClick={() => {
                    if (isSpeaker) {
                      onToggleMic?.();
                    } else {
                      onClose();
                      onRequestMic?.();
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Section 3: Features Center */}
          <div>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-3">
              Features Center
            </span>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {isHost && (
                <ToolButton
                  id="pk"
                  label="PK Battle"
                  icon={<Swords className="w-6 h-6 text-purple-400" />}
                  badge="VS"
                  badgeColor="bg-gradient-to-r from-purple-600 to-pink-600"
                  onClick={() => {
                    onClose();
                    onOpenPK?.();
                  }}
                />
              )}

              <ToolButton
                id="rank"
                label="Rank"
                icon={<Trophy className="w-6 h-6 text-amber-400" />}
                onClick={() => {
                  onClose();
                  onOpenPKRank?.();
                }}
              />

              {isHost && (
                <ToolButton
                  id="rewards"
                  label="Rewards"
                  icon={<Coins className="w-6 h-6 text-yellow-400" />}
                  badge="GIVE"
                  badgeColor="bg-amber-500"
                  onClick={() => {
                    onClose();
                    onOpenRewards?.();
                  }}
                />
              )}

              <ToolButton
                id="store"
                label="Store"
                icon={<ShoppingBag className="w-6 h-6 text-rose-400" />}
                onClick={() => {
                  onClose();
                  if (onOpenStore) onOpenStore();
                  else navigate('/diamonds');
                }}
              />

              <ToolButton
                id="bag"
                label="Bag"
                icon={<Backpack className="w-6 h-6 text-sky-400" />}
                onClick={() => {
                  onClose();
                  if (onOpenBag) onOpenBag();
                  else navigate('/backpack');
                }}
              />

              <ToolButton
                id="gift_gallery"
                label="Gift Gallery"
                icon={<Storefront className="w-6 h-6 text-cyan-400" />}
                badge="TOP 3"
                badgeColor="bg-cyan-500"
                onClick={() => {
                  onClose();
                  onOpenGiftGallery?.();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
