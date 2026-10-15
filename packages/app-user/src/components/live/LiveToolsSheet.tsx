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
} from 'react-icons/pi';
import { useUIStore } from '../../stores';

export interface LiveToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  videoEnabled?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  isSpeaker?: boolean;
  micRequestPending?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onRequestMic?: () => void;
  onSwitchCamera?: () => void;
  onToggleFilters?: () => void;
  onOpenGift?: () => void;
  onShare?: () => void;
  onReport?: () => void;
}

interface ToolItem {
  id: string;
  label: string;
  Icon: typeof Video;
  badge?: string;
  badgeColor?: string;
  active?: boolean;
  onClick: () => void;
}

export const LiveToolsSheet = ({
  isOpen,
  onClose,
  isHost,
  videoEnabled = true,
  cameraOn = true,
  micOn = true,
  isSpeaker = false,
  micRequestPending = false,
  onToggleCamera,
  onToggleMic,
  onRequestMic,
  onSwitchCamera,
  onToggleFilters,
  onOpenGift,
  onShare,
  onReport,
}: LiveToolsSheetProps) => {
  const showToast = useUIStore((s) => s.showToast);

  if (!isOpen) return null;

  // Host-only live broadcast controls
  const hostControlTools: ToolItem[] = [
    ...(videoEnabled && onSwitchCamera ? [{
      id: 'switch_camera',
      label: 'Flip Camera',
      Icon: Repeat,
      onClick: () => {
        onSwitchCamera();
        showToast('Camera switched', 'info');
      },
    }] : []),
    ...(onToggleCamera ? [{
      id: 'camera',
      label: cameraOn ? 'Camera ON' : 'Camera OFF',
      Icon: cameraOn ? Video : VideoOff,
      badge: cameraOn ? 'ON' : 'OFF',
      badgeColor: cameraOn ? 'bg-emerald-500' : 'bg-red-500',
      active: cameraOn,
      onClick: () => {
        onToggleCamera();
      },
    }] : []),
    ...(onToggleMic ? [{
      id: 'mic',
      label: micOn ? 'Mic ON' : 'Mic OFF',
      Icon: micOn ? Mic : MicOff,
      badge: micOn ? 'ON' : 'OFF',
      badgeColor: micOn ? 'bg-emerald-500' : 'bg-red-500',
      active: micOn,
      onClick: () => {
        onToggleMic();
      },
    }] : []),
    ...(videoEnabled && onToggleFilters ? [{
      id: 'filters',
      label: 'Beauty & Filter',
      Icon: Wand2,
      badge: 'PRO',
      badgeColor: 'bg-purple-500',
      onClick: () => {
        onClose();
        onToggleFilters();
      },
    }] : []),
    ...(onShare ? [{
      id: 'share_live',
      label: 'Share Live',
      Icon: Share2,
      onClick: () => {
        onClose();
        onShare();
      },
    }] : []),
  ];

  // Viewer quick controls
  const viewerControlTools: ToolItem[] = [
    {
      id: 'viewer_mic',
      label: isSpeaker ? (micOn ? 'Mic ON' : 'Mic OFF') : (micRequestPending ? 'Requested' : 'Request Mic'),
      Icon: isSpeaker ? (micOn ? Mic : MicOff) : Mic,
      badge: isSpeaker ? (micOn ? 'ON' : 'OFF') : (micRequestPending ? 'WAIT' : 'MIC'),
      badgeColor: isSpeaker ? (micOn ? 'bg-emerald-500' : 'bg-red-500') : (micRequestPending ? 'bg-amber-500' : 'bg-pink-500'),
      active: isSpeaker ? micOn : micRequestPending,
      onClick: () => {
        if (isSpeaker) {
          if (onToggleMic) onToggleMic();
        } else {
          onClose();
          if (onRequestMic) onRequestMic();
        }
      },
    },
    ...(onOpenGift ? [{
      id: 'send_gift',
      label: 'Send Gift',
      Icon: Gift,
      badge: 'HOT',
      badgeColor: 'bg-gradient-to-r from-pink-500 to-rose-500',
      onClick: () => {
        onClose();
        onOpenGift();
      },
    }] : []),
    ...(onShare ? [{
      id: 'share',
      label: 'Share Live',
      Icon: Share2,
      onClick: () => {
        onClose();
        onShare();
      },
    }] : []),
    ...(onReport ? [{
      id: 'report',
      label: 'Report Host',
      Icon: Flag,
      onClick: () => {
        onClose();
        onReport();
      },
    }] : []),
  ];

  const tools = isHost ? hostControlTools : viewerControlTools;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-md bg-[#161726]/95 border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl animate-slide-up pb-safe text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10 shrink-0">
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

        {/* Tools Grid */}
        <div className="px-5 py-6">
          <div className="grid grid-cols-4 gap-y-5 gap-x-3">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={tool.onClick}
                className="flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <span
                  className={`relative w-13 h-13 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                    tool.active === false
                      ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                      : tool.active === true
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/10 hover:bg-white/15 border border-white/10 text-white'
                  }`}
                  style={{ width: '3.25rem', height: '3.25rem' }}
                >
                  <tool.Icon className="w-6 h-6" />
                  {tool.badge && (
                    <span
                      className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black text-white shadow ${
                        tool.badgeColor || 'bg-pink-500'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-white/90 font-medium text-center leading-tight truncate w-full">
                  {tool.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
