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
  PiMusicNoteFill as MusicNote,
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
                  id="admins"
                  label="Admins"
                  icon={<Backpack className="w-6 h-6 text-sky-400" />}
                  onClick={() => {
                    onClose();
                    onOpenAdmins?.();
                  }}
                />

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

                <ToolButton
                  id="ambient_sound"
                  label="Ambient Sound"
                  icon={<MusicNote className="w-6 h-6 text-purple-400" />}
                  onClick={() => {
                    showToast('Ambient background music active', 'info');
                  }}
                />

                <ToolButton
                  id="fan_club"
                  label="Fan Club"
                  icon={<Heart className="w-6 h-6 text-pink-400 fill-current" />}
                  onClick={() => {
                    showToast('Fan Club management', 'info');
                  }}
                />
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
                id="vip"
                label="VIP"
                icon={<Diamond className="w-6 h-6 text-purple-400" />}
                onClick={() => {
                  onClose();
                  if (onOpenVIP) onOpenVIP();
                  else navigate('/vip');
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

              <ToolButton
                id="lucky_box"
                label="Lucky Box"
                icon={<Cube className="w-6 h-6 text-amber-400" />}
                badge="FREE"
                badgeColor="bg-emerald-500"
                onClick={() => {
                  onClose();
                  if (onOpenLuckyBox) onOpenLuckyBox();
                  else showToast('Lucky Box available every 10 minutes!', 'info');
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
