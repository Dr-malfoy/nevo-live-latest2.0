interface OnlineDotProps {
  online?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Draw a white ring — for dots sitting on an avatar rather than in text. */
  ringed?: boolean;
  className?: string;
}

/**
 * Requirement #3A — green dot when online, grey when offline.
 * Presence comes from the server (`online`, derived from `lastActiveAt`).
 */
export const OnlineDot = ({ online, size = 'sm', ringed = false, className = '' }: OnlineDotProps) => (
  <span
    role="img"
    aria-label={online ? 'Online' : 'Offline'}
    title={online ? 'Online' : 'Offline'}
    className={`inline-block rounded-full shrink-0 z-20 shadow-xs
      ${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}
      ${online ? 'bg-status-online' : 'bg-status-offline'}
      ${ringed ? 'ring-2 ring-white' : ''}
      ${className}`}
  />
);
