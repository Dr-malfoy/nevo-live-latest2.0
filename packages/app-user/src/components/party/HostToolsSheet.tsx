import { PiBellFill as Bell, PiCameraFill as Camera, PiCrownFill as Crown, PiGiftFill as Gift, PiHeadphonesFill as Headphones, PiImageFill as ImageIcon, PiChartLineUpFill as LineChart, PiChatTeardropFill as MessageSquare, PiMicrophoneFill as Mic, PiMusicNoteFill as Music, PiPackageFill as Package, PiArrowsClockwiseBold as Repeat, PiSlidersFill as Settings2, PiShareNetworkFill as Share2, PiToteFill as ShoppingBag, PiSparkleFill as Sparkles, PiStarFill as Star, PiSwordFill as Swords, PiTrophyFill as Trophy, PiVideoCameraFill as Video, PiSpeakerHighFill as Volume2, PiMagicWandFill as Wand2, PiXBold as X } from 'react-icons/pi';

interface HostToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Host-only tools are hidden for ordinary members. */
  isHost: boolean;
  onAction: (key: string, label: string) => void;
}

/**
 * Requirement #17 Part B — the Host Tools bottom sheet behind the grid icon.
 *
 * Three groups: Host Tools (8), Basic Tools (7), Features Center (12).
 * Deliberately dark (#1A1A1A) — it sits over a live party room.
 */

interface Tool {
  key: string;
  label: string;
  Icon: typeof Crown;
  dot?: boolean;
  on?: boolean;
}

const HOST_TOOLS: Tool[] = [
  { key: 'admins', label: 'Admins', Icon: Crown },
  { key: 'text_bubble', label: 'Text Bubble', Icon: MessageSquare },
  { key: 'fan_club', label: 'Fan Club', Icon: Star },
  { key: 'live_data', label: 'Live Data', Icon: LineChart },
  { key: 'live_management', label: 'Live Management', Icon: Settings2 },
  { key: 'ambient_sound', label: 'Ambient Sound', Icon: Music },
  { key: 'screen_recording', label: 'Screen Recording', Icon: Video, dot: true },
  { key: 'live_intro', label: 'Live Stream Intro', Icon: ImageIcon, dot: true },
];

const BASIC_TOOLS: Tool[] = [
  { key: 'message', label: 'Message', Icon: MessageSquare, dot: true },
  { key: 'switch_camera', label: 'Switch Camera', Icon: Repeat },
  { key: 'beauty', label: 'Beauty', Icon: Wand2 },
  { key: 'mirror', label: 'Mirror', Icon: Camera },
  { key: 'share', label: 'Share', Icon: Share2 },
  { key: 'effect_msg', label: 'Effect & Msg', Icon: Sparkles },
  { key: 'noise_reduction', label: 'Noise Reduction', Icon: Volume2, on: true },
];

const FEATURES: Tool[] = [
  { key: 'rank', label: 'Rank', Icon: Trophy },
  { key: 'pk', label: 'PK', Icon: Swords },
  { key: 'rewards', label: 'Rewards', Icon: Gift },
  { key: 'store', label: 'Store', Icon: ShoppingBag },
  { key: 'vip', label: 'VIP', Icon: Crown },
  { key: 'gift_center', label: 'Gift Center', Icon: Gift },
  { key: 'bag', label: 'Bag', Icon: Package, dot: true },
  { key: 'gift_gallery', label: 'Gift Gallery', Icon: ImageIcon },
  { key: 'lucky_box', label: 'Lucky Box', Icon: Sparkles, dot: true },
  { key: 'gift_collection', label: 'Gift Collection', Icon: Star },
  { key: 'coins_trading', label: 'Coins Trading', Icon: Repeat },
  { key: 'gift_wish', label: 'Gift Wish', Icon: Star },
];

const ToolGrid = ({ tools, onAction }: { tools: Tool[]; onAction: HostToolsSheetProps['onAction'] }) => (
  <div className="grid grid-cols-4 gap-y-4">
    {tools.map(({ key, label, Icon, dot, on }) => (
      <button
        key={key}
        onClick={() => onAction(key, label)}
        className="flex flex-col items-center gap-1.5 active:opacity-60"
      >
        <span className="relative w-12 h-12 rounded-full bg-[#333333] flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
          {dot && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-status-live" />}
          {on && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 px-1 rounded-full bg-status-online text-[8px] font-bold text-white flex items-center">
              ON
            </span>
          )}
        </span>
        <span className="text-[10px] text-white/80 text-center leading-tight">{label}</span>
      </button>
    ))}
  </div>
);

export const HostToolsSheet = ({ isOpen, onClose, isHost, onAction }: HostToolsSheetProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-t-sheet max-h-[80vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 h-14 shrink-0">
          <h3 className="text-base font-bold text-white">{isHost ? 'Host Tools' : 'Tools'}</h3>
          <button onClick={onClose} aria-label="Close" className="text-white/60 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
          {isHost && (
            <section>
              <h4 className="text-xs font-semibold text-white/50 mb-3">Host Tools</h4>
              <ToolGrid tools={HOST_TOOLS} onAction={onAction} />
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold text-white/50 mb-3">Basic Tools</h4>
            <ToolGrid tools={BASIC_TOOLS} onAction={onAction} />
          </section>

          <section>
            <h4 className="text-xs font-semibold text-white/50 mb-3">Features Center</h4>
            <ToolGrid tools={FEATURES} onAction={onAction} />
          </section>
        </div>
      </div>
    </div>
  );
};

/** Small helper so the room can render the same icon set in its bottom bar. */
export const PARTY_BOTTOM_ICONS = [
  { key: 'chat', label: 'Chat', Icon: MessageSquare },
  { key: 'mic', label: 'Mic', Icon: Mic },
  { key: 'emoji', label: 'Emoji', Icon: Sparkles },
  { key: 'tools', label: 'Tools', Icon: Settings2, dot: true },
  { key: 'box', label: 'Box', Icon: Package },
  { key: 'pk', label: 'PK', Icon: Swords },
  { key: 'game', label: 'Game', Icon: Headphones },
  { key: 'gift', label: 'Gift', Icon: Gift },
];

export { Bell };
