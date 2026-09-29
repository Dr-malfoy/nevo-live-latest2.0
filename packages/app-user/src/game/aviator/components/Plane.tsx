import React from 'react';

// A small animated rocket drawn with pure CSS/SVG — no Unity.
// It climbs/tilts as the multiplier rises and falls away on crash.
export const Plane: React.FC<{ multiplier: number; crashed: boolean; waiting: boolean }> = ({
  multiplier,
  crashed,
  waiting,
}) => {
  const climb = Math.max(0, Math.min(1, (multiplier - 1) / 1.5)); // 0..1 over 1x..2.5x
  const tilt = -climb * 24; // degrees, nose up as it climbs
  const trailWidth = 40 + climb * 80;

  // Vertical climb is handled by the container (FlightCanvas `bottom` offset).
  // Here we only add the nose-up tilt (and crash handled by the SCSS keyframe),
  // avoiding the double vertical translation that pushed the rocket out of view.
  return (
    <div
      className={`aviator-plane ${crashed ? 'aviator-plane--crashed' : ''} ${waiting ? 'aviator-plane--waiting' : ''}`}
      style={{ transform: `rotate(${waiting ? 0 : tilt}deg)` }}
    >
      {/* Rocket pointing up-right toward the sky */}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        {/* Body */}
        <path
          d="M32 4 C36 14 42 22 42 34 C42 42 38 48 32 52 C26 48 22 42 22 34 C22 22 28 14 32 4 Z"
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        {/* Nose cone */}
        <path d="M32 4 C36 14 42 22 42 28 L22 28 C22 22 28 14 32 4 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />
        {/* Window */}
        <circle cx="32" cy="30" r="5.5" fill="#3b82f6" stroke="#1e40af" strokeWidth="1.5" />
        <circle cx="30.5" cy="28.5" r="1.8" fill="#fff" opacity="0.8" />
        {/* Left fin */}
        <path d="M24 38 L14 50 L24 47 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Right fin */}
        <path d="M40 38 L50 50 L40 47 Z" fill="#f43f5e" stroke="#be123c" strokeWidth="1.2" strokeLinejoin="round" />
        {/* Engine nozzle */}
        <rect x="29" y="52" width="6" height="6" rx="1.5" fill="#64748b" />
        {/* Flame */}
        <path
          d="M32 60 C27 57 25 54 32 48 C39 54 37 57 32 60 Z"
          fill="#fbbf24"
        />
        <path
          d="M32 58 C29 56 28 54 32 50 C36 54 35 56 32 58 Z"
          fill="#f97316"
        />
      </svg>
      {/* Flame trail (replaces the old wing trail) */}
      <div className="aviator-plane__trail" style={{ width: trailWidth }} />
    </div>
  );
};
