// Layered SVG European roulette wheel.
// 37 pockets, metallic gradients, specular rim, glass reflection.
// The winning pocket is highlighted after the spin (no static top needle).
// Rotation uses an SVG-native transform string (`rotate(a cx cy)`) via a
// motion value, which rotates around the exact center — CSS transform-origin
// on SVG <g> elements is unreliable in framer-motion.

import React, { memo } from 'react';
import { motion, MotionValue, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { EUROPEAN_WHEEL, POCKET_COUNT, POCKET_ANGLE, colorOf, wheelLabel } from '../utils/wheel';

export const WHEEL_SIZE = 420;
export const WHEEL_CENTER = WHEEL_SIZE / 2;

interface WheelProps {
  rotation: MotionValue<number>;
  spinning: boolean;
  winningIndex: number | null;
}

const POCKET_INNER = 58; // hub radius
const POCKET_OUTER = 176; // pocket ring outer radius
const SEPARATOR_R = 134;

/** Polar path for a pocket wedge. */
function wedgePath(startAngleDeg: number, endAngleDeg: number, r0: number, r1: number): string {
  const a0 = ((startAngleDeg - 90) * Math.PI) / 180;
  const a1 = ((endAngleDeg - 90) * Math.PI) / 180;
  const x0 = WHEEL_CENTER + r1 * Math.cos(a0);
  const y0 = WHEEL_CENTER + r1 * Math.sin(a0);
  const x1 = WHEEL_CENTER + r1 * Math.cos(a1);
  const y1 = WHEEL_CENTER + r1 * Math.sin(a1);
  const x2 = WHEEL_CENTER + r0 * Math.cos(a1);
  const y2 = WHEEL_CENTER + r0 * Math.sin(a1);
  const x3 = WHEEL_CENTER + r0 * Math.cos(a0);
  const y3 = WHEEL_CENTER + r0 * Math.sin(a0);
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return [
    `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A ${r1} ${r1} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A ${r0} ${r0} 0 ${largeArc} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    'Z',
  ].join(' ');
}

const POCKET_FILLS: Record<string, string> = {
  red: 'url(#pocket-red)',
  black: 'url(#pocket-black)',
  green: 'url(#pocket-green)',
};

const POCKET_TEXT: Record<string, string> = {
  red: '#FFF3E0',
  black: '#E8E8F0',
  green: '#FFF8E1',
};

function pocketTextColor(index: number): string {
  return POCKET_TEXT[colorOf(index)];
}

function Pockets({ winningIndex, spinning }: { winningIndex: number | null; spinning: boolean }) {
  return (
    <g>
      {EUROPEAN_WHEEL.map((num, i) => {
        const start = i * POCKET_ANGLE;
        const end = (i + 1) * POCKET_ANGLE;
        const mid = (start + end) / 2;
        const color = colorOf(num);
        const textR = (POCKET_INNER + POCKET_OUTER) / 2;
        const rad = ((mid - 90) * Math.PI) / 180;
        const tx = WHEEL_CENTER + textR * Math.cos(rad);
        const ty = WHEEL_CENTER + textR * Math.sin(rad);
        // Rotate text so it reads along the radius (upside down on the left half).
        const textRot = mid > 180 ? mid + 180 : mid;
        const isWinner = winningIndex === i && !spinning;
        return (
          <g key={num}>
            <path
              d={wedgePath(start, end, POCKET_INNER, POCKET_OUTER)}
              fill={POCKET_FILLS[color]}
              stroke={isWinner ? '#F5C451' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isWinner ? 2.5 : 0.5}
            />
            {isWinner && (
              <path
                d={wedgePath(start, end, POCKET_INNER, POCKET_OUTER)}
                fill="rgba(245, 196, 81, 0.25)"
              />
            )}
            <text
              x={tx}
              y={ty}
              fill={isWinner ? '#FFEB3B' : pocketTextColor(num)}
              fontSize={isWinner ? 16 : 15}
              fontWeight={isWinner ? 900 : 700}
              textAnchor="middle"
              dominantBaseline="central"
              transform={`rotate(${textRot - 90} ${tx} ${ty})`}
            >
              {wheelLabel(num)}
            </text>
            {/* Separator stud */}
            <circle cx={WHEEL_CENTER + SEPARATOR_R * Math.cos(rad)} cy={WHEEL_CENTER + SEPARATOR_R * Math.sin(rad)} r={3.2} fill="url(#metal)"/>
          </g>
        );
      })}
    </g>
  );
}

const WheelInner = ({ rotation, spinning, winningIndex }: WheelProps) => {
  // All hooks run unconditionally (Rules of Hooks).
  // Breathing glow when spinning or on a win.
  const glowOpacity = useTransform(rotation, (r) => (spinning ? 0.35 : r === 0 ? 0.15 : 0.25));
  // Glass sweep — continuously rotating reflection driven per animation frame.
  const glassAngle = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    glassAngle.set((glassAngle.get() + (delta / 1000) * 30) % 360);
  });

  return (
    <svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} className="w-full h-full" role="img" aria-label={`Roulette wheel${winningIndex !== null ? `, last result ${wheelLabel(winningIndex)}` : ''}`}>
      <defs>
        {/* Metallic gold rim */}
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a6118" />
          <stop offset="25%" stopColor="#F5C451" />
          <stop offset="50%" stopColor="#ffeba8" />
          <stop offset="75%" stopColor="#F5C451" />
          <stop offset="100%" stopColor="#7a5410" />
        </linearGradient>
        <linearGradient id="gold-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5c4008" />
          <stop offset="50%" stopColor="#b98a2e" />
          <stop offset="100%" stopColor="#5c4008" />
        </linearGradient>
        {/* Metallic silver */}
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="30%" stopColor="#e5e7eb" />
          <stop offset="60%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
        <linearGradient id="metal-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="50%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        {/* Pocket fills */}
        <radialGradient id="pocket-red" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#ff5a5a" />
          <stop offset="70%" stopColor="#c81e1e" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="pocket-black" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="70%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="pocket-green" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="70%" stopColor="#15803d" />
          <stop offset="100%" stopColor="#14532d" />
        </radialGradient>
        {/* Hub */}
        <radialGradient id="hub" cx="50%" cy="38%" r="80%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="60%" stopColor="#18181b" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="hub-gold" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#F5C451" />
          <stop offset="55%" stopColor="#8a6118" />
          <stop offset="100%" stopColor="#4a3206" />
        </radialGradient>
        {/* Glass reflection sweep */}
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {/* Glows */}
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245,196,81,0.35)" />
          <stop offset="100%" stopColor="rgba(245,196,81,0)" />
        </radialGradient>
        <radialGradient id="win-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(245,196,81,0.55)" />
          <stop offset="100%" stopColor="rgba(245,196,81,0)" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.6" />
        </filter>
        <filter id="specular" x="-20%" y="-20%" width="140%" height="140%">
          <feSpecularLighting specularConstant="0.9" specularExponent="22" lightingColor="#fff8d0" result="spec">
            <fePointLight x="120" y="-120" z="200" />
          </feSpecularLighting>
          <feComposite in="SourceGraphic" in2="spec" operator="arithmetic" k1="0" k2="1" k3="0.25" k4="0" />
        </filter>
        <clipPath id="wheel-clip">
          <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_OUTER + 14} />
        </clipPath>
        <mask id="glass-mask">
          <rect x="0" y="0" width={WHEEL_SIZE} height={WHEEL_SIZE} fill="#000" />
          <ellipse cx={WHEEL_CENTER} cy={WHEEL_CENTER} rx={POCKET_OUTER + 8} ry={POCKET_OUTER + 8} fill="#fff" />
        </mask>
      </defs>

      {/* Breathing glow */}
      <motion.circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={WHEEL_CENTER - 4} fill="url(#win-glow)" style={{ opacity: glowOpacity }} />

      {/* Outer golden rim */}
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={207} fill="url(#gold)" filter="url(#drop)" />
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={207} fill="url(#gold)" filter="url(#specular)" />
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={196} fill="url(#gold-dark)" />
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={183} fill="url(#metal)" />
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={183} fill="url(#metal)" filter="url(#specular)" />
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={178} fill="url(#metal-dark)" />

      {/* Ball track — static ring the ball orbits on before dropping into a
          pocket (mirrors the classic roulette ball track). The ball starts at
          r≈158 and decays inward, so it visibly rides this track then falls. */}
      <g>
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={164} fill="#1a1a24" stroke="url(#metal)" strokeWidth={3} />
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={150} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} />
        {Array.from({ length: 37 }).map((_, i) => {
          const a = ((i * 360) / 37 - 90) * (Math.PI / 180);
          return (
            <circle
              key={i}
              cx={WHEEL_CENTER + 157 * Math.cos(a)}
              cy={WHEEL_CENTER + 157 * Math.sin(a)}
              r={1.6}
              fill="rgba(245,196,81,0.5)"
            />
          );
        })}
      </g>

      {/* Rotating pocket ring — SVG-native rotate around the exact center */}
      <motion.g
        style={{
          rotate: rotation,
          transformOrigin: `${WHEEL_CENTER}px ${WHEEL_CENTER}px`,
          originX: 0.5,
          originY: 0.5,
        }}
      >
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_OUTER} fill="#0c0c10" />
        <Pockets winningIndex={winningIndex} spinning={spinning} />
        {/* Center hub */}
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_INNER} fill="url(#hub)" stroke="url(#gold-dark)" strokeWidth={3} />
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_INNER - 12} fill="url(#hub-gold)" />
        <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_INNER - 12} fill="url(#hub-gold)" filter="url(#specular)" />
        <text
          x={WHEEL_CENTER}
          y={WHEEL_CENTER}
          fill="#2b1c02"
          fontSize={17}
          fontWeight={800}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Inter, sans-serif"
          letterSpacing="1"
        >
          ROULETTE
        </text>
      </motion.g>

      {/* Glass reflection sweep (rotates slowly) */}
      <g mask="url(#glass-mask)">
        <motion.g
          style={{
            rotate: glassAngle,
            transformOrigin: `${WHEEL_CENTER}px ${WHEEL_CENTER}px`,
            originX: 0.5,
            originY: 0.5,
          }}
        >
          <ellipse
            cx={WHEEL_CENTER}
            cy={WHEEL_CENTER}
            rx={POCKET_OUTER + 8}
            ry={POCKET_OUTER + 8}
            fill="url(#glass)"
          />
        </motion.g>
      </g>

      {/* Static inner shadow ring for depth */}
      <circle cx={WHEEL_CENTER} cy={WHEEL_CENTER} r={POCKET_OUTER + 14} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={10} filter="url(#soft)" clipPath="url(#wheel-clip)" />
    </svg>
  );
};

export const Wheel = memo(WheelInner);
