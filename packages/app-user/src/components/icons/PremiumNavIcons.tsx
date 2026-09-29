import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  isActive?: boolean;
}

// Helper to define consistent colors
const getFill = (isActive: boolean) => (isActive ? '#000000' : '#cbd5e1');

export const TvIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="3" y="6" width="18" height="13" rx="4.5" fill={getFill(isActive)} />
    <path d="M8 3.5L11 6M16 3.5L13 6" stroke={getFill(isActive)} strokeWidth="2" strokeLinecap="round" />
    <path d="M10.5 10.2c0-.5.5-.8.9-.6l3.2 1.8c.4.2.4.8 0 1l-3.2 1.8c-.4.2-.9-.1-.9-.6v-3.4z" fill={isActive ? '#fff' : '#fff'} />
  </svg>
);

export const DiamondIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 21.5c-3.5-1-7.2-5-7.5-9.2-.1-1.7.5-3.5 1.5-4.8 2-2.5 5.2-3.5 8.2-2.5 2.5.8 4.2 3.2 4.3 6 .1 4.2-3.2 9.5-6.5 10.5z" fill={getFill(isActive)} />
    <path d="M10 10.5c1.2 1.5 3.5 1.5 5 0" stroke={isActive ? '#fff' : '#fff'} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M19 4l1 1m0 0l1 1m-1-1l1-1m-1 1l-1 1" stroke={getFill(isActive)} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const PlanetIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <ellipse cx="12" cy="12" rx="6" ry="6" transform="rotate(-30 12 12)" fill={getFill(isActive)} />
    <path d="M4 16c2.5 3.5 8 5 12.5 3.5s7.5-5 5-8.5" stroke={getFill(isActive)} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M8.5 9c1-1 2.5-1 3.5 0" stroke={isActive ? '#fff' : '#fff'} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const GamepadIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect x="2" y="7" width="20" height="12" rx="6" fill={getFill(isActive)} />
    <circle cx="7" cy="13" r="1.5" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="17" cy="11.5" r="1" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="15.5" cy="13" r="1" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="18.5" cy="13" r="1" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="17" cy="14.5" r="1" fill={isActive ? '#fff' : '#fff'} />
  </svg>
);

export const ChatSmileIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 21c-4.5 0-8-3.5-8-8s3.5-8 8-8 8 3.5 8 8c0 1.7-.5 3.2-1.3 4.5l1.3 3.5-3.5-1.3c-1.3.8-2.8 1.3-4.5 1.3z" fill={getFill(isActive)} />
    <circle cx="9" cy="11" r="1" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="15" cy="11" r="1" fill={isActive ? '#fff' : '#fff'} />
    <path d="M9.5 14c.8 1 2.2 1 3 0" stroke={isActive ? '#fff' : '#fff'} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const BearProfileIcon = ({ isActive = false, ...props }: IconProps) => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.5 7.5A2.5 2.5 0 0 1 20 10v.5A5.5 5.5 0 0 1 14.5 16h-5A5.5 5.5 0 0 1 4 10.5V10a2.5 2.5 0 0 1 2.5-2.5h.5A5.5 5.5 0 0 1 12.5 6a5.5 5.5 0 0 1 5.5 1.5z" fill={getFill(isActive)} />
    <path d="M16 4.5a2 2 0 1 1 2.5 3" stroke={getFill(isActive)} strokeWidth="2" strokeLinecap="round" />
    <path d="M8 4.5a2 2 0 1 0-2.5 3" stroke={getFill(isActive)} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9.5" cy="11" r="1.2" fill={isActive ? '#fff' : '#fff'} />
    <circle cx="14.5" cy="11" r="1.2" fill={isActive ? '#fff' : '#fff'} />
  </svg>
);
