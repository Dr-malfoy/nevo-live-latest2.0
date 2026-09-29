// Capped SVG particle burst — gold sparks / stars (60fps-ish via rAF batches).

import { useCallback, useRef, useState } from 'react';
import { mulberry32 } from '../physics/easing';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // remaining ms
  shape: 'star' | 'spark' | 'smoke';
}

const COLORS = ['#F5C451', '#FFD97A', '#FFF3C4', '#FFB84C', '#FFFFFF'];

let nextId = 0;

export function useParticles(max = 60) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  const burst = useCallback(
    (x: number, y: number, count = 24, spread = 40) => {
      const rand = mulberry32(Date.now() & 0xffffffff);
      const created: Particle[] = Array.from({ length: count }, () => {
        const angle = rand() * Math.PI * 2;
        const speed = 1 + rand() * 3;
        const shape = rand() < 0.5 ? 'spark' : rand() < 0.75 ? 'star' : 'smoke';
        return {
          id: nextId++,
          x,
          y,
          vx: Math.cos(angle) * speed * spread * 0.06,
          vy: Math.sin(angle) * speed * spread * 0.06,
          size: 2 + rand() * 4,
          color: COLORS[Math.floor(rand() * COLORS.length)],
          life: 700 + rand() * 600,
          shape,
        };
      });
      setParticles((prev) => [...prev.slice(-max), ...created]);
    },
    [max]
  );

  // Physics tick — rAF loop, updates velocities and expires particles.
  const tick = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(32, now - last.current);
    last.current = now;
    setParticles((prev) => {
      if (prev.length === 0) return prev;
      return prev
        .map((p) => ({
          ...p,
          x: p.x + p.vx * dt * 0.06,
          y: p.y + p.vy * dt * 0.06,
          vy: p.vy + 0.08 * dt * 0.01, // slight gravity
          life: p.life - dt,
        }))
        .filter((p) => p.life > 0);
    });
  }, []);

  const loop = useCallback(() => {
    tick();
    raf.current = requestAnimationFrame(loop);
  }, [tick]);

  const start = useCallback(() => {
    if (raf.current !== null) return;
    last.current = performance.now();
    raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  return { particles, burst, start, stop, clear: () => setParticles([]) };
}
