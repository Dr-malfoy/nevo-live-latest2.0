import React from 'react';

/**
 * Handheld stage microphone ("mouthpiece") icon matching user reference design.
 * Features: tilted 45° dynamic mic with rounded dome grill, collar ring,
 * rounded capsule base, tapered handle with rounded end, and switch toggle slot.
 */
export const MouthIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="rotate(45, 12, 12)">
      {/* Top hemispherical dome grill */}
      <path d="M7.8 5.2 A 4.6 4.6 0 0 1 16.2 5.2" />
      {/* Collar ring band */}
      <rect x="6.2" y="5.2" width="11.6" height="2.8" rx="1.4" />
      {/* Lower capsule base */}
      <path d="M7.8 8 A 4.6 4.6 0 0 0 16.2 8" />
      {/* Tapered handle with rounded bottom cap */}
      <path d="M8.8 9.5 L9.6 19.5 a2.4 2.4 0 0 0 4.8 0 L15.2 9.5" />
      {/* Power / mute toggle switch on handle */}
      <line x1="12" y1="12.8" x2="12" y2="15.5" strokeWidth="2.2" />
    </g>
  </svg>
);

export const MouthOffIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="rotate(45, 12, 12)" opacity="0.6">
      {/* Top hemispherical dome grill */}
      <path d="M7.8 5.2 A 4.6 4.6 0 0 1 16.2 5.2" />
      {/* Collar ring band */}
      <rect x="6.2" y="5.2" width="11.6" height="2.8" rx="1.4" />
      {/* Lower capsule base */}
      <path d="M7.8 8 A 4.6 4.6 0 0 0 16.2 8" />
      {/* Tapered handle with rounded bottom cap */}
      <path d="M8.8 9.5 L9.6 19.5 a2.4 2.4 0 0 0 4.8 0 L15.2 9.5" />
      {/* Power / mute toggle switch on handle */}
      <line x1="12" y1="12.8" x2="12" y2="15.5" strokeWidth="2.2" />
    </g>
    {/* Diagonal mute slash */}
    <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
