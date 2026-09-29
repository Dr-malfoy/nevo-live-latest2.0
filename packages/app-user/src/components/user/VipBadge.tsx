import { vipInfo } from '../../lib/levels';
import { VipCapsule } from './LevelBadge';

interface VipBadgeProps {
  noble?: { type: string; expiry: string } | null;
  isVip?: boolean;
  diamonds?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Requirement #3A — VIP Badge next to the user name.
 * Renders noble tier VIP badge or diamond VIP capsule when user has purchased diamonds.
 */
export const VipBadge = ({ noble, isVip, diamonds, size = 'sm', className = '' }: VipBadgeProps) => {
  const vip = vipInfo(noble);
  if (vip) {
    const dims = size === 'sm' ? 'h-[18px] px-1.5 text-[10px]' : 'h-6 px-2 text-xs';
    return (
      <span
        title={`VIP level ${vip.rank}`}
        className={`inline-flex items-center justify-center rounded-md font-bold leading-none shrink-0 ${dims} ${vip.pill} ${className}`}
      >
        {vip.label}
      </span>
    );
  }

  if (isVip || (diamonds && diamonds > 0)) {
    return (
      <VipCapsule
        label="VIP"
        className={`cursor-default ${size === 'sm' ? 'text-[9px] py-0 px-1.5' : 'text-[11px] py-0.5 px-2'} ${className}`}
      />
    );
  }

  return null;
};
