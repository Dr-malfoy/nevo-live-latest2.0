import { PiCaretRightBold as ChevronRight } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import type { UserPublic } from '../../types';
import { timeAgo } from '../../lib/time';
import { Avatar } from './Avatar';
import { UserNameplate } from './UserNameplate';
import { FollowButton } from './FollowButton';

interface UserListRowProps {
  user: UserPublic & { visitTime?: string; isFollowing?: boolean };
  /** Show the Follow / Following pill (requirement #2). */
  showFollow?: boolean;
  /** Show "2h ago" under the name — visitor lists. */
  showVisitTime?: boolean;
  /** Replaces the default chevron + navigation. */
  right?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Requirement #4 — the standard user card:
 *
 *   [Pic] 🟢 Mehedi Hasan 🇧🇩 [Lv.15] [VIP3]   [Follow]  ›
 *         HOST
 *
 * The whole row (and the `›`) opens that user's full details page.
 */
export const UserListRow = ({
  user,
  showFollow = false,
  showVisitTime = false,
  right,
  onClick,
  className = '',
}: UserListRowProps) => {
  const navigate = useNavigate();
  const open = onClick ?? (() => navigate(`/user/${user._id}`));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') open();
      }}
      className={`flex items-center gap-3 px-4 py-3 bg-white active:bg-surface-sunken transition-colors cursor-pointer ${className}`}
    >
      <Avatar src={user.avatar} nickname={user.nickname} size="md" online={user.online} />

      <div className="flex-1 min-w-0">
        <UserNameplate user={user} size="sm" wrap />
        {showVisitTime && user.visitTime && (
          <p className="text-xs text-ink-faint mt-0.5">Visited {timeAgo(user.visitTime)}</p>
        )}
        {!showVisitTime && user.bio && (
          <p className="text-xs text-ink-muted mt-0.5 truncate">{user.bio}</p>
        )}
      </div>

      {right}

      {showFollow && (
        <FollowButton targetUserId={user._id} initialFollowing={user.isFollowing} size="sm" />
      )}

      {/* Requirement #4 — the arrow into the full details page. */}
      <ChevronRight className="w-5 h-5 text-ink-ghost shrink-0" />
    </div>
  );
};
