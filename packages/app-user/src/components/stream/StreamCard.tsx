import { useNavigate } from 'react-router-dom';
import { PiGameControllerFill as Gamepad2, PiMicrophoneFill as Mic, PiRadioFill as Radio, PiVideoCameraFill as Video } from 'react-icons/pi';
import { LevelBadge } from '../user';
import { flagEmoji } from '../../lib/countries';
import { compactNumber } from '../../lib/time';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';
import type { LiveStream, UserPublic } from '../../types';

interface StreamCardProps {
  stream: LiveStream;
}

/**
 * Feed card.
 *
 * The card is a piece of media, so its overlay text stays white-on-dark by
 * design — the white theme applies to the app chrome around it, not to text
 * sitting on someone's video thumbnail.
 */

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Video className="w-3 h-3" />,
  voice: <Mic className="w-3 h-3" />,
  game: <Gamepad2 className="w-3 h-3" />,
};

const TYPE_LABEL: Record<string, string> = {
  voice: 'VOICE',
  game: 'GAME',
};

/** Deterministic placeholder tint so a card without a cover still looks intentional. */
const PLACEHOLDER_TINTS = [
  'linear-gradient(135deg, #E9D5FF 0%, #FBCFE8 100%)',
  'linear-gradient(135deg, #DBEAFE 0%, #CFFAFE 100%)',
  'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
  'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
];

export const StreamCard = ({ stream }: StreamCardProps) => {
  const navigate = useNavigate();

  // hostId may be null (orphaned ref) or a raw id string.
  const host = typeof stream.hostId === 'string' || !stream.hostId ? null : (stream.hostId as UserPublic);
  const isLive = stream.status === 'live';
  const thumb = stream.thumbnail || stream.cover || host?.avatar || '';
  const country = stream.country || host?.country;

  const hostAny = host as any;
  const wealth = hostAny?.wealthLevel && hostAny.wealthLevel > 1
    ? hostAny.wealthLevel
    : calculateWealthLevel(hostAny?.diamonds, hostAny?.level).level;
  const live = hostAny?.liveLevel && hostAny.liveLevel > 1
    ? hostAny.liveLevel
    : calculateLiveLevel(hostAny?.coins, hostAny?.level).level;
  const hostLevel = Math.max(wealth, live, hostAny?.level || 1);

  const tint = PLACEHOLDER_TINTS[stream._id.charCodeAt(stream._id.length - 1) % PLACEHOLDER_TINTS.length];

  return (
    <div
      onClick={() => navigate(`/live/${stream._id}`)}
      className="relative rounded-card overflow-hidden cursor-pointer active:scale-[0.98] transition-transform bg-surface-sunken shadow-card"
    >
      <div className="aspect-[3/4] relative" style={thumb ? undefined : { background: tint }}>
        {thumb ? (
          <img
            src={thumb}
            alt={stream.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-ghost">
            <Radio className="w-8 h-8" />
          </div>
        )}

        {/* Readability scrim — only where text sits. */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Top-left: LIVE / type */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {isLive && (
            <span className="bg-status-live text-white text-[10px] font-bold px-1.5 h-[18px] rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {stream.type !== 'video' && (
            <span className="bg-black/50 backdrop-blur text-white text-[10px] font-bold px-1.5 h-[18px] rounded flex items-center gap-1">
              {TYPE_ICONS[stream.type]}
              {TYPE_LABEL[stream.type]}
            </span>
          )}
        </div>

        {/* Top-right: viewers */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/45 backdrop-blur text-white text-[10px] font-semibold px-1.5 h-[18px] rounded">
          <Radio className="w-2.5 h-2.5" />
          {compactNumber(Math.max(0, stream.viewerCount))}
        </div>

        {/* Bottom: host identity */}
        <div className="absolute inset-x-0 bottom-0 p-2">
          <p className="text-[12px] font-semibold text-white truncate drop-shadow">{stream.title}</p>
          {host && (
            <div className="flex items-center gap-1 mt-1 min-w-0">
              {country && <span className="text-[11px] leading-none shrink-0">{flagEmoji(country)}</span>}
              <span className="text-[11px] text-white/90 truncate">{host.nickname}</span>
              <LevelBadge level={hostLevel} className="!h-[15px] !px-1 !text-[9px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
