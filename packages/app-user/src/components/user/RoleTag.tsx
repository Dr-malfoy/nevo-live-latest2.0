import { PiSealCheckFill as BadgeCheck, PiCoinsFill as Coins, PiMicrophoneFill as Mic, PiUsersFill as Users } from 'react-icons/pi';
import type { UserPublic, User } from '../../types';

type RoleSource = Pick<UserPublic, 'role' | 'isAgent' | 'sellerType' | 'verification'> &
  Partial<Pick<User, 'isAdmin'>>;

interface RoleTagsProps {
  user?: RoleSource | null;
  size?: 'sm' | 'md';
  /** Cap how many tags render, so a long name row cannot be pushed off screen. */
  max?: number;
  className?: string;
}

interface TagSpec {
  key: string;
  label: string;
  className: string;
  Icon: typeof Mic;
}

/**
 * Requirement #3B — the role tag under the nickname.
 *
 *   HOST        red
 *   AGENT       blue
 *   COIN SELLER gold
 *   OFFICIAL    blue tick ✅
 *
 * A user can hold several at once (an agent who is also a coin seller), so
 * this returns a list rather than a single tag.
 */
export function resolveRoleTags(user?: RoleSource | null): TagSpec[] {
  if (!user) return [];
  const tags: TagSpec[] = [];

  // OFFICIAL outranks the rest — it goes first.
  if (user.isAdmin || user.role === 'admin' || user.sellerType === 'official') {
    tags.push({
      key: 'official',
      label: 'OFFICIAL',
      className: 'bg-role-official/10 text-role-official',
      Icon: BadgeCheck,
    });
  }

  if (user.role === 'host') {
    tags.push({
      key: 'host',
      label: 'HOST',
      className: 'bg-role-host/10 text-role-host',
      Icon: Mic,
    });
  }

  if (user.role === 'agent' || user.isAgent) {
    tags.push({
      key: 'agent',
      label: 'AGENT',
      className: 'bg-role-agent/10 text-role-agent',
      Icon: Users,
    });
  }

  if (user.sellerType === 'paylor') {
    tags.push({
      key: 'seller',
      label: 'COIN SELLER',
      className: 'bg-role-seller/15 text-[#B4771A]',
      Icon: Coins,
    });
  }

  return tags;
}

export const RoleTags = ({ user, size = 'sm', max = 3, className = '' }: RoleTagsProps) => {
  const tags = resolveRoleTags(user).slice(0, max);
  if (tags.length === 0) return null;

  const dims = size === 'sm' ? 'h-[18px] px-1.5 text-[9px] gap-0.5' : 'h-5 px-2 text-[10px] gap-1';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <span className={`inline-flex items-center gap-1 flex-wrap ${className}`}>
      {tags.map(({ key, label, className: tagClass, Icon }) => (
        <span
          key={key}
          className={`inline-flex items-center rounded font-bold tracking-wide leading-none ${dims} ${tagClass}`}
        >
          <Icon className={iconSize} strokeWidth={2.5} />
          {label}
        </span>
      ))}
    </span>
  );
};
