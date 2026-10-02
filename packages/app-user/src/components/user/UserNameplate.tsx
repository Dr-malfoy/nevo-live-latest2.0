import type { User, UserPublic } from '../../types';
import { flagEmoji } from '../../lib/countries';
import { LevelBadge } from './LevelBadge';
import { VipBadge } from './VipBadge';
import { OnlineDot } from './OnlineDot';
import { RoleTags } from './RoleTag';
import { HostBadge } from './HostBadge';

type NameplateUser = Partial<UserPublic> & Partial<User> & { nickname: string; hostBadge?: string };

interface UserNameplateProps {
  user: NameplateUser;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the role tag row (tight spaces such as a chat list row). */
  showRoles?: boolean;
  showFlag?: boolean;
  showLevel?: boolean;
  showVip?: boolean;
  showHostBadge?: boolean;
  showOnline?: boolean;
  showId?: boolean;
  /**
   * Let the badges wrap to a second line instead of squeezing the name.
   * On by default for `lg`; turn it on for list rows, where the Follow pill
   * and chevron leave little horizontal room.
   */
  wrap?: boolean;
  className?: string;
}

const nameSize = {
  sm: 'text-sm',
  md: 'text-[15px]',
  lg: 'text-lg',
};

/**
 * Requirement #3 — the standard identity block used everywhere a user's name
 * appears:
 *
 *   🟢 Mehedi Hasan [ALPHA HOST] [Lv.15] [VIP3]
 *   HOST
 *
 * One component so the badges stay consistent across the feed, profiles,
 * lists and chat.
 */
export const UserNameplate = ({
  user,
  size = 'sm',
  showRoles = true,
  showFlag = true,
  showLevel = true,
  showVip = true,
  showHostBadge = true,
  showOnline = true,
  showId = true,
  wrap,
  className = '',
}: UserNameplateProps) => {
  const badgeSize = size === 'lg' ? 'md' : 'sm';
  // Badges wrap so a full name is never truncated just to fit the pills.
  const wraps = wrap ?? size === 'lg';

  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`flex items-center gap-1.5 min-w-0 ${wraps ? 'flex-wrap' : ''}`}>
        {showOnline && <OnlineDot online={user.online} size={size === 'lg' ? 'md' : 'sm'} />}

        <span className={`font-semibold text-ink truncate ${nameSize[size]}`}>{user.nickname}</span>

        {showHostBadge && user.hostBadge && user.hostBadge !== 'none' && (
          <HostBadge badge={user.hostBadge} size={badgeSize === 'md' ? 'sm' : 'xs'} />
        )}

        {showId && user.uid && (
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
            ID: {user.uid}
          </span>
        )}

        {showFlag && user.country && (
          <span className="shrink-0 leading-none" title={user.country}>
            {flagEmoji(user.country)}
          </span>
        )}

        {showLevel && user.level != null && (
          <LevelBadge level={user.level} size={badgeSize} />
        )}

        {showVip && (
          <VipBadge
            noble={user.noble as any}
            isVip={user.isVip || (user as any).hasPurchasedDiamonds || Boolean((user as any).wealthExp && (user as any).wealthExp > 0)}
            wealthExp={(user as any).wealthExp}
            diamonds={user.diamonds}
            size={badgeSize}
          />
        )}
      </div>

      {showRoles && <RoleTags user={user as any} size={badgeSize} className="mt-1" />}
    </div>
  );
};
