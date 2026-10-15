import { useNavigate } from 'react-router-dom';
import {
  PiXBold as X,
  PiVideoCameraFill as Video,
  PiVideoCameraSlashFill as VideoOff,
  PiMicrophoneFill as Mic,
  PiMicrophoneSlashFill as MicOff,
  PiArrowsClockwiseBold as Repeat,
  PiMagicWandFill as Wand2,
  PiStickerFill as Sticker,
  PiShareNetworkFill as Share2,
  PiTrophyFill as Trophy,
  PiSwordFill as Swords,
  PiGiftFill as Gift,
  PiShoppingBagFill as ShoppingBag,
  PiStarFill as Star,
  PiPackageFill as Package,
  PiFlagFill as Flag,
  PiSparkleFill as Sparkles,
  PiGameControllerFill as Gamepad,
  PiAirplaneTakeoffFill as Airplane,
  PiCardsFill as Cards,
  PiCoinsFill as Coins,
} from 'react-icons/pi';
import { useUIStore } from '../../stores';

export interface LiveToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  videoEnabled?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  onToggleCamera?: () => void;
  onToggleMic?: () => void;
  onSwitchCamera?: () => void;
  onToggleFilters?: () => void;
  onToggleStickers?: () => void;
  onOpenGift?: () => void;
  onShare?: () => void;
  onReport?: () => void;
}

interface ToolItem {
  id: string;
  label: string;
  Icon: typeof Trophy;
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
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  onToggleFilters,
  onToggleStickers,
  onOpenGift,
  onShare,
  onReport,
}: LiveToolsSheetProps) => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    if (isHost) {
      if (window.confirm('You are currently hosting this live stream. Leaving will pause or end your broadcast. Are you sure you want to open this page?')) {
        onClose();
        navigate(path);
      }
    } else {
      onClose();
      navigate(path);
    }
  };

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
    ...(onToggleStickers ? [{
      id: 'stickers',
      label: 'Stickers',
      Icon: Sticker,
      badge: 'NEW',
      badgeColor: 'bg-pink-500',
      onClick: () => {
        onClose();
        onToggleStickers();
      },
    }] : []),
    ...(onToggleCamera ? [{
      id: 'camera',
      label: cameraOn ? 'Camera ON' : 'Camera OFF',
      Icon: cameraOn ? Video : VideoOff,
      badge: cameraOn ? 'ON' : 'OFF',
      badgeColor: cameraOn ? 'bg-emerald-500' : 'bg-red-500',
      active: cameraOn,
      onClick: onToggleCamera,
    }] : []),
    ...(onToggleMic ? [{
      id: 'mic',
      label: micOn ? 'Mic ON' : 'Mic OFF',
      Icon: micOn ? Mic : MicOff,
      badge: micOn ? 'ON' : 'OFF',
      badgeColor: micOn ? 'bg-emerald-500' : 'bg-red-500',
      active: micOn,
      onClick: onToggleMic,
    }] : []),
    ...(onShare ? [{
      id: 'share_live',
      label: 'Share Live',
      Icon: Share2,
      onClick: onShare,
    }] : []),
    {
      id: 'pk_battle',
      label: 'PK Battle',
      Icon: Swords,
      badge: 'LIVE',
      badgeColor: 'bg-amber-500',
      onClick: () => {
        showToast('PK Battle matchmaking is open', 'info');
      },
    },
  ];

  // Viewer quick controls
  const viewerControlTools: ToolItem[] = [
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
      onClick: onShare,
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

  // Live mini games (integrated into streaming session)
  const gameTools: ToolItem[] = [
    {
      id: 'game_aviator',
      label: 'Aviator',
      Icon: Airplane,
      badge: 'HOT',
      badgeColor: 'bg-red-600',
      onClick: () => handleNavigate('/game/aviator'),
    },
    {
      id: 'game_teenpatti',
      label: 'Teen Patti',
      Icon: Cards,
      badge: 'POPULAR',
      badgeColor: 'bg-amber-600',
      onClick: () => handleNavigate('/game/teenpatti'),
    },
    {
      id: 'game_roulette',
      label: 'Roulette',
      Icon: Coins,
      badge: 'WIN',
      badgeColor: 'bg-emerald-600',
      onClick: () => handleNavigate('/game/roulette'),
    },
    {
      id: 'game_luckyspin',
      label: 'Lucky Spin',
      Icon: Sparkles,
      onClick: () => handleNavigate('/lucky-spin'),
    },
    {
      id: 'all_games',
      label: 'Games Hub',
      Icon: Gamepad,
      onClick: () => handleNavigate('/games'),
    },
  ];

  // Features center (Rankings, Store, Bag, Rewards, Fan Club)
  const featureTools: ToolItem[] = [
    {
      id: 'rankings',
      label: 'Rankings',
      Icon: Trophy,
      onClick: () => handleNavigate('/rankings?board=gift'),
    },
    {
      id: 'store',
      label: 'Store & VIP',
      Icon: ShoppingBag,
      onClick: () => handleNavigate('/store'),
    },
    {
      id: 'rewards',
      label: 'Rewards',
      Icon: Gift,
      onClick: () => handleNavigate('/rewards'),
    },
    {
      id: 'fan_club',
      label: 'Fan Club',
      Icon: Star,
      onClick: () => handleNavigate('/fan-club'),
    },
    {
      id: 'bag',
      label: 'My Bag',
      Icon: Package,
      onClick: () => handleNavigate('/bag'),
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative w-full max-w-md bg-[#16161E]/95 border-t border-white/10 rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl animate-slide-up pb-safe text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <h3 className="text-base font-bold text-white tracking-wide">
              {isHost ? 'Live Tools & Controls' : 'Live Menu & Features'}
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

        {/* Scrollable Tool Sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 no-scrollbar">
          {/* Controls Group */}
          <section>
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-3">
              {isHost ? 'Host Broadcast Controls' : 'Live Actions'}
            </h4>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {(isHost ? hostControlTools : viewerControlTools).map((tool) => (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="relative w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors shadow-sm">
                    <tool.Icon className="w-6 h-6 text-white" />
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
                  <span className="text-[10px] text-white/80 font-medium text-center leading-tight truncate w-full">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Mini Games Group */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-white/40">
                Live Mini Games
              </h4>
              <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1">
                <Coins className="w-3 h-3" /> Win Coins & Diamonds
              </span>
            </div>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {gameTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-white/15 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/15 flex items-center justify-center transition-colors shadow-sm">
                    <tool.Icon className="w-6 h-6 text-white" />
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
                  <span className="text-[10px] text-white/80 font-medium text-center leading-tight truncate w-full">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Features Center Group */}
          <section>
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-white/40 mb-3">
              Features & Activities
            </h4>
            <div className="grid grid-cols-4 gap-y-4 gap-x-2">
              {featureTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="relative w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-colors shadow-sm">
                    <tool.Icon className="w-6 h-6 text-white" />
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
                  <span className="text-[10px] text-white/80 font-medium text-center leading-tight truncate w-full">
                    {tool.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
