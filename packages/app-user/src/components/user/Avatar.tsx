import { useState, useEffect } from 'react';
import { initial } from '../../lib/time';
import { OnlineDot } from './OnlineDot';

interface AvatarProps {
  src?: string;
  nickname: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show the presence dot on the bottom-right corner. */
  online?: boolean;
  /** Draw a white ring — for avatars on a coloured or image background. */
  ringed?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizes = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const dotOffset = {
  xs: '-bottom-0 -right-0',
  sm: '-bottom-0 -right-0',
  md: 'bottom-0 right-0',
  lg: 'bottom-0.5 right-0.5',
  xl: 'bottom-1 right-1',
  '2xl': 'bottom-1.5 right-1.5',
};

export const Avatar = ({
  src,
  nickname,
  size = 'md',
  online,
  ringed = false,
  className = '',
  onClick,
}: AvatarProps) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const ring = ringed ? 'ring-2 ring-white' : '';

  const inner = src && !hasError ? (
    <img
      src={src}
      alt={nickname}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      loading="lazy"
      className={`rounded-full object-cover bg-surface-sunken ${sizes[size]} ${ring}`}
    />
  ) : (
    <div
      className={`rounded-full bg-gradient-to-tr from-[#6C5CE7] to-[#FD79A8] text-white flex items-center justify-center font-bold uppercase shadow-sm select-none ${sizes[size]} ${ring}`}
    >
      {initial(nickname) || 'U'}
    </div>
  );

  // No presence to show — skip the wrapper entirely.
  if (online === undefined) {
    return (
      <div className={`shrink-0 ${className}`} onClick={onClick}>
        {inner}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 ${className}`} onClick={onClick}>
      {inner}
      <OnlineDot
        online={online}
        size={size === 'xs' || size === 'sm' ? 'sm' : 'md'}
        ringed
        className={`absolute ${dotOffset[size]}`}
      />
    </div>
  );
};
