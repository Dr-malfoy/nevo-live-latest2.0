// SVG chip — metallic ring, edge ticks, value.

import React, { memo } from 'react';

interface ChipProps {
  value: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

const CHIP_COLORS: Record<number, { edge: string; face: string; text: string }> = {
  1: { edge: '#9ca3af', face: '#e5e7eb', text: '#111827' },
  5: { edge: '#dc2626', face: '#ef4444', text: '#ffffff' },
  10: { edge: '#1d4ed8', face: '#3b82f6', text: '#ffffff' },
  25: { edge: '#047857', face: '#10b981', text: '#ffffff' },
  50: { edge: '#0e7490', face: '#06b6d4', text: '#ffffff' },
  100: { edge: '#7e22ce', face: '#a855f7', text: '#ffffff' },
  500: { edge: '#a16207', face: '#eab308', text: '#111827' },
  1000: { edge: '#be185d', face: '#ec4899', text: '#ffffff' },
};

const ChipInner = ({ value, size = 32, className, style, onClick, disabled }: ChipProps) => {
  const c = CHIP_COLORS[value] || CHIP_COLORS[1];
  const id = `chip-${value}-${size}`;
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Place ${value} chip` : `${value} chip`}
      aria-disabled={disabled}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={c.face} />
          <stop offset="100%" stopColor={c.edge} />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <circle cx="20" cy="20" r="18" fill={c.edge} filter={`url(#${id}-shadow)`} />
      {ticks.map((a) => (
        <rect
          key={a}
          x={a % 90 === 0 ? 18.5 : 19.2}
          y="1.5"
          width={a % 90 === 0 ? 3 : 1.6}
          height="4.5"
          rx="0.8"
          fill="#fff"
          opacity="0.85"
          transform={`rotate(${a} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="12.5" fill={`url(#${id}-face)`} stroke="#000" strokeOpacity="0.25" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="9.5" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.7" />
      <text x="20" y="23.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={c.text} fontFamily="Inter, sans-serif">
        {value}
      </text>
    </svg>
  );
};

export const Chip = memo(ChipInner);
