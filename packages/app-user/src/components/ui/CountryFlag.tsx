import React, { useState } from 'react';
import { flagEmoji } from '../../lib/countries';

export interface CountryFlagProps {
  code?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!code || code === 'ALL' || code.trim().length !== 2) {
    return <span className="inline-block text-base leading-none">🌍</span>;
  }

  const clean = code.trim().toLowerCase();
  const dimClass =
    size === 'sm'
      ? 'w-4 h-3'
      : size === 'lg'
      ? 'w-6 h-4'
      : 'w-5 h-3.5';

  if (hasError) {
    return <span className="inline-block leading-none text-base">{flagEmoji(code)}</span>;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${clean}.png`}
      alt={code.toUpperCase()}
      onError={() => setHasError(true)}
      className={`inline-block object-cover rounded-[3px] shadow-2xs shrink-0 border border-black/10 ${dimClass} ${className}`}
      loading="lazy"
    />
  );
};
