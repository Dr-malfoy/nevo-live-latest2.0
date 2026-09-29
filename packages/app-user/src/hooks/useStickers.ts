import { useCallback, useState } from 'react';

export interface PlacedSticker {
  id: string; // placement instance id
  stickerId: string;
  x: number; // % of overlay width
  y: number; // % of overlay height
  scale: number;
  rotation: number;
  z: number;
}

let instanceCounter = 0;

/** Host-local sticker overlay state: add, move, resize, rotate, remove, layer. */
export const useStickers = () => {
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addSticker = useCallback((stickerId: string) => {
    const instanceId = `st-${Date.now()}-${instanceCounter++}`;
    setStickers((prev) => [
      ...prev,
      {
        id: instanceId,
        stickerId,
        x: 50,
        y: 45,
        scale: 1,
        rotation: 0,
        z: prev.length,
      },
    ]);
    setSelectedId(instanceId);
  }, []);

  const moveSticker = useCallback((id: string, x: number, y: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  }, []);

  const resizeSticker = useCallback((id: string, delta: number) => {
    setStickers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, scale: Math.min(3, Math.max(0.4, s.scale + delta)) } : s
      )
    );
  }, []);

  const rotateSticker = useCallback((id: string, delta: number) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, rotation: s.rotation + delta } : s)));
  }, []);

  const removeSticker = useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  /** Bring a sticker to the top (layer ordering by z). */
  const bringToFront = useCallback((id: string) => {
    setStickers((prev) => {
      const maxZ = prev.length ? Math.max(...prev.map((s) => s.z)) : 0;
      return prev.map((s) => (s.id === id ? { ...s, z: maxZ + 1 } : s));
    });
  }, []);

  const clearStickers = useCallback(() => {
    setStickers([]);
    setSelectedId(null);
  }, []);

  return {
    stickers,
    selectedId,
    selectSticker: setSelectedId,
    addSticker,
    moveSticker,
    resizeSticker,
    rotateSticker,
    removeSticker,
    bringToFront,
    clearStickers,
  };
};
