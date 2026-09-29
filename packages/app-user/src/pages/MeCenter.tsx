import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiSealCheckFill as BadgeCheck, PiCaretRightBold as ChevronRight, PiClockFill as Clock, PiCrownFill as Crown, PiHeadphonesFill as Headphones, PiHeartFill as Heart, PiLightbulbFill as Lightbulb, PiMedalFill as Medal, PiPlanetFill as Orbit, PiShieldCheckFill as ShieldCheck, PiToteFill as ShoppingBag, PiTelevisionFill as Tv } from 'react-icons/pi';
import { useUIStore } from '../stores';

/**
 * Requirement #29 — the Me center menu.
 *
 * Rows whose backend isn't built yet are marked "Soon" and are not tappable,
 * rather than navigating to an empty screen. Each one lights up as its API
 * lands (see API-SPEC.md); the `to` field is all that needs filling in.
 */

interface MenuItem {
  key: string;
  label: string;
  Icon: typeof Tv;
  tint: string;
  /** Route to open. Absent means the backend isn't ready yet. */
  to?: string;
  /** Right-hand hint, e.g. "24h". */
  value?: string;
  dot?: boolean;
}

const CREATOR_CENTERS: MenuItem[] = [
  { key: 'streamer', label: 'Streamer Center', Icon: Tv, tint: 'text-ink-muted', to: '/streamer-center' },
  { key: 'video_creator', label: 'Video Creator Center', Icon: Lightbulb, tint: 'text-ink-muted', to: '/creator-center' },
  { key: 'builder', label: 'Builder Center', Icon: Orbit, tint: 'text-accent-500' },
];

const GENERAL: MenuItem[] = [
  { key: 'help', label: 'Help Center', Icon: Headphones, tint: 'text-[#F5A623]', value: '24h' },
  { key: 'watch_history', label: 'Watch History', Icon: Clock, tint: 'text-ink-muted', to: '/watch-history' },
  { key: 'guardian', label: 'Guardian', Icon: ShieldCheck, tint: 'text-ink-muted' },
  { key: 'level', label: 'Level', Icon: Crown, tint: 'text-ink-muted', to: '/levels' },
  { key: 'achievement', label: 'Achievement Poster', Icon: Medal, tint: 'text-ink-muted', to: '/achievements' },
  { key: 'bag', label: 'Bag', Icon: ShoppingBag, tint: 'text-ink-muted', dot: true, to: '/store' },
  { key: 'authentication', label: 'Authentication', Icon: BadgeCheck, tint: 'text-role-official', to: '/verification' },
  { key: 'follow_us', label: 'Follow Us', Icon: Heart, tint: 'text-ink-muted' },
];

export const MeCenter = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const open = (item: MenuItem) => {
    if (item.to) {
      navigate(item.to);
      return;
    }
    showToast(`${item.label} is coming soon`, 'info');
  };

  const renderGroup = (items: MenuItem[]) => (
    <div className="mx-3 mt-3 list-group">
      {items.map((item) => {
        const ready = !!item.to;
        return (
          <button
            key={item.key}
            onClick={() => open(item)}
            className={`list-row w-full ${ready ? '' : 'opacity-60'}`}
          >
            <item.Icon className={`w-[22px] h-[22px] ${item.tint}`} />
            <span className="flex-1 text-left">{item.label}</span>

            {item.value && <span className="text-sm text-ink-muted">{item.value}</span>}
            {item.dot && ready && <span className="w-2 h-2 rounded-full bg-status-live" />}
            {!ready && (
              <span className="text-[10px] font-bold text-ink-faint bg-surface-sunken px-1.5 py-0.5 rounded">
                SOON
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-ink-ghost" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink">More</h1>
        </div>
      </header>

      {renderGroup(CREATOR_CENTERS)}
      {renderGroup(GENERAL)}
    </div>
  );
};
