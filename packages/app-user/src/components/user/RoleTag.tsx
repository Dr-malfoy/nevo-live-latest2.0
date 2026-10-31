import { PiSealCheckFill as BadgeCheck, PiCoinsFill as Coins, PiMicrophoneFill as Mic, PiUsersFill as Users, PiCodeBold as CodeIcon } from 'react-icons/pi';
import { IoDiamond } from 'react-icons/io5';
import type { UserPublic, User } from '../../types';

type RoleSource = Partial<UserPublic> & Partial<User> & {
  uid?: string;
  isDeveloper?: boolean;
};

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
  Icon: any;
}

/**
 * Requirement #3B — the role tag under the nickname.
 *
 *   DEVELOPER   cyan/emerald neon
 *   OFFICIAL    blue tick ✅
 *   HOST        red
 *   AGENT       blue
 *   COIN SELLER gold
 *
 * A user can hold several at once (an agent who is also a coin seller), so
 * this returns a list rather than a single tag.
 */
export function resolveRoleTags(user?: RoleSource | null): TagSpec[] {
  if (!user) return [];
  const tags: TagSpec[] = [];

  const isUser168012 = (user as any).uid === '168012';

  // SYSTEM DEVELOPER: creator role. If user 168012 has their custom equipped developer badge,
  // do not duplicate with a text role tag.
  const hasEquippedDevBadge = Boolean(
    (user as any).equippedBadge?.name?.toLowerCase()?.includes('dev') ||
    isUser168012
  );

  if ((user as any).isDeveloper && !hasEquippedDevBadge) {
    tags.push({
      key: 'developer',
      label: 'SYSTEM DEVELOPER',
      className: 'relative overflow-hidden bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 text-cyan-300 border border-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.5)] font-black tracking-wider animate-pulse',
      Icon: CodeIcon,
    });
  }

  // OFFICIAL outranks the rest — it goes next.
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

  // Diamond Seller has the official 3D animated SellerBadge next to their name/badge row.
  // We do NOT duplicate it as a text role tag here to prevent double badge display.
  const isDiamondSeller = Boolean(
    user.role === 'diamond_seller' ||
    user.sellerType === 'diamond_seller' ||
    (user as any).isDiamondSeller ||
    (user as any).diamondSellerBadge
  );

  if (!isDiamondSeller && (user.role === 'agent' || user.isAgent)) {
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
