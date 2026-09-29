import { PiSealCheckFill as BadgeCheck } from 'react-icons/pi';
import type { VerificationState } from '../../types';

interface VerifiedBadgeProps {
  verification?: VerificationState;
  className?: string;
  showLabel?: boolean;
}

/**
 * Blue verification badge — shown only when the account is VERIFIED.
 * Source of truth is the backend `verification.verified` flag — never set client-side.
 */
export const VerifiedBadge = ({ verification, className = '', showLabel = false }: VerifiedBadgeProps) => {
  if (!verification?.verified) return null;

  return (
    <span
      title="Verified"
      className={`inline-flex items-center gap-1 shrink-0 ${className}`}
    >
      <BadgeCheck className="w-4 h-4 text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
      {showLabel && (
        <span className="text-[10px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/30 rounded-full px-1.5 py-0.5 leading-none">
          Verified
        </span>
      )}
    </span>
  );
};
