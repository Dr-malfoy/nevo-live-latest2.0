import React from 'react';

export const BkashLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#E2136E" />
    <path d="M58 24L26 52L46 56L36 96L74 58L55 54L78 34L58 24Z" fill="white" />
    <path d="M78 34L96 38L79 49L78 34Z" fill="#FFA3C9" />
    <path d="M79 49L98 53L74 58L79 49Z" fill="#C20B5C" />
  </svg>
);

export const NagadLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="nagadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F99F1B" />
        <stop offset="100%" stopColor="#ED1C24" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#nagadGrad)" />
    <circle cx="60" cy="60" r="34" fill="white" />
    <path d="M60 36C60 36 74 47 74 61C74 70 67 76 60 78C53 76 46 70 46 61C46 51 55 45 60 36Z" fill="#ED1C24" />
    <circle cx="60" cy="61" r="7" fill="#F99F1B" />
  </svg>
);

export const RocketLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#8C3494" />
    <path d="M60 24C47 38 41 55 43 72L53 68L60 96L67 68L77 72C79 55 73 38 60 24Z" fill="white" />
    <circle cx="60" cy="46" r="6" fill="#8C3494" />
    <path d="M43 72L32 81L45 79Z" fill="#E2B8EC" />
    <path d="M77 72L88 81L75 79Z" fill="#E2B8EC" />
  </svg>
);

export const BinanceLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#181A20" />
    <g transform="translate(26, 26) scale(2.83)">
      <path d="M12 2L15.5 5.5L8.5 12.5L5 9L12 2Z" fill="#F3BA2F" />
      <path d="M18.5 8.5L22 12L15 19L11.5 15.5L18.5 8.5Z" fill="#F3BA2F" />
      <path d="M12 22L8.5 18.5L15.5 11.5L19 15L12 22Z" fill="#F3BA2F" />
      <path d="M5.5 15.5L2 12L9 5L12.5 8.5L5.5 15.5Z" fill="#F3BA2F" />
      <path d="M12 8.5L15.5 12L12 15.5L8.5 12L12 8.5Z" fill="#F3BA2F" />
    </g>
  </svg>
);

export const BybitLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#121214" />
    <path d="M38 34H53L66 53L53 72H38L51 53L38 34Z" fill="#F7A600" />
    <path d="M60 34H75L88 53L75 72H60L73 53L60 34Z" fill="#FFFFFF" />
    <circle cx="63" cy="85" r="4" fill="#F7A600" />
  </svg>
);

export const UsdtLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="120" height="120" rx="24" fill="#26A17B" />
    <path d="M80 38H40V46H55V53.2C43.5 54 35 56.3 35 59C35 61.7 43.5 64 55 64.8V78H65V64.8C76.5 64 85 61.7 85 59C85 56.3 76.5 54 65 53.2V46H80V38ZM60 62.5C48 62.5 43 60.5 43 59C43 57.5 48 55.5 60 55.5C72 55.5 77 57.5 77 59C77 60.5 72 62.5 60 62.5Z" fill="white" />
  </svg>
);
