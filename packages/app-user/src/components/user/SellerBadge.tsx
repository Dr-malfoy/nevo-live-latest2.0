import { PiSealCheckFill as BadgeCheck, PiCoinsFill as Coins } from 'react-icons/pi';

export type SellerType = 'none' | 'official' | 'paylor';

interface SellerBadgeProps {
  sellerType?: SellerType | string;
  className?: string;
  showLabel?: boolean;
}

/**
 * Admin-controlled seller badges.
 * - official: blue verified-style "Official Coin Seller"
 * - paylor: gold coin "Paylor Coin Seller"
 * Source of truth is the backend `sellerType` field — never set client-side.
 */
export const SellerBadge = ({ sellerType, className = '', showLabel = false }: SellerBadgeProps) => {
  if (!sellerType || sellerType === 'none') return null;

  if (sellerType === 'official') {
    return (
      <span
        title="Official Coin Seller"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <BadgeCheck className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
        {showLabel && (
          <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/30 rounded-full px-1.5 py-0.5 leading-none">
            Official
          </span>
        )}
      </span>
    );
  }

  if (sellerType === 'paylor') {
    return (
      <span
        title="Paylor Coin Seller"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <Coins className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        {showLabel && (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-1.5 py-0.5 leading-none">
            Paylor
          </span>
        )}
      </span>
    );
  }

  return null;
};
