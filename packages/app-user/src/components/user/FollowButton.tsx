import { PiCheckBold as Check, PiPlusBold as Plus } from 'react-icons/pi';
import { useFollow } from '../../hooks/useFollow';

interface FollowButtonProps {
  targetUserId?: string | null;
  initialFollowing?: boolean;
  size?: 'sm' | 'md';
  /** `overlay` inverts for use on top of media (live room header). */
  variant?: 'default' | 'overlay';
  onCountsChange?: (followers: number) => void;
  className?: string;
}

/**
 * Follow / Following pill. Wraps `useFollow`, so it never blind-toggles and
 * cannot fire twice on a double tap.
 */
export const FollowButton = ({
  targetUserId,
  initialFollowing,
  size = 'sm',
  variant = 'default',
  onCountsChange,
  className = '',
}: FollowButtonProps) => {
  const { following, busy, toggle } = useFollow({ targetUserId, initialFollowing, onCountsChange });

  if (!targetUserId) return null;

  const dims = size === 'sm' ? 'h-8 px-3.5 text-xs' : 'h-10 px-5 text-sm';

  const tone = following
    ? variant === 'overlay'
      ? 'bg-white/25 text-white'
      : 'bg-surface-sunken text-ink-muted'
    : variant === 'overlay'
      ? 'bg-white text-ink'
      : 'bg-black text-white';

  return (
    <button
      onClick={(e) => {
        // Rows are usually clickable — don't navigate when the pill is tapped.
        e.stopPropagation();
        e.preventDefault();
        toggle();
      }}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1 rounded-full font-semibold shrink-0
        transition-colors active:scale-95 disabled:opacity-50 ${dims} ${tone} ${className}`}
    >
      {following ? (
        <>
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
          Following
        </>
      ) : (
        <>
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          Follow
        </>
      )}
    </button>
  );
};
