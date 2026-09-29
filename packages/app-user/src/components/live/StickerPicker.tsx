import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiTrashFill as Trash2, PiArrowCounterClockwiseBold as RotateCcw, PiMagnifyingGlassPlusFill as ZoomIn, PiMagnifyingGlassMinusFill as ZoomOut, PiStickerFill as Sticker, PiSmileyFill as Smile, PiVideoCameraFill as Video } from 'react-icons/pi';
import { STICKERS, STICKER_CATEGORIES, CATEGORY_LABELS, EMOJIS, GIFS, getStickerContent } from '../../content/stickers';
import type { PlacedSticker } from '../../hooks/useStickers';

interface StickerPickerProps {
  open: boolean;
  onAdd: (stickerId: string) => void;
  onClose: () => void;
}

type Mode = 'stickers' | 'emoji' | 'gif';

const MODES: { key: Mode; label: string; icon: typeof Sticker }[] = [
  { key: 'stickers', label: 'Stickers', icon: Sticker },
  { key: 'emoji', label: 'Emoji', icon: Smile },
  { key: 'gif', label: 'GIF', icon: Video },
];

export const StickerPicker = ({ open, onAdd, onClose }: StickerPickerProps) => {
  const [mode, setMode] = useState<Mode>('stickers');
  const [category, setCategory] = useState<(typeof STICKER_CATEGORIES)[number]>('cute');

  const stickers = STICKERS.filter((s) => s.category === category);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="absolute bottom-24 inset-x-3 z-40 glass-card p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-white/80">Add Effect</p>
            <button onClick={onClose} aria-label="Close picker" className="p-1 text-white/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Top-level tabs: Stickers / Emoji / GIF */}
          <div className="flex gap-1.5 mb-3">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  mode === key
                    ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === 'stickers' && (
            <>
              {/* Category chips */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-3">
                {STICKER_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                      category === c
                        ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>

              {/* Sticker grid */}
              <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto no-scrollbar">
                {stickers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onAdd(s.id)}
                    aria-label={`Add ${s.name} sticker`}
                    className="aspect-square rounded-lg bg-white/5 hover:bg-white/15 transition-colors flex items-center justify-center"
                  >
                    {s.svg}
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'emoji' && (
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto no-scrollbar">
              {EMOJIS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onAdd(`emoji:${e.id}`)}
                  aria-label={`Add ${e.name} emoji`}
                  className="aspect-square rounded-lg bg-white/5 hover:bg-white/15 transition-colors flex items-center justify-center text-2xl"
                >
                  {e.glyph}
                </button>
              ))}
            </div>
          )}

          {mode === 'gif' && (
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto no-scrollbar">
              {GIFS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => onAdd(`gif:${g.id}`)}
                  aria-label={`Add ${g.name} effect`}
                  className="aspect-square rounded-lg bg-white/5 hover:bg-white/15 transition-colors flex items-center justify-center"
                >
                  {g.svg}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface StickerOverlayProps {
  stickers: PlacedSticker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, delta: number) => void;
  onRotate: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
}

/** Rendered above the live video. Only the selected sticker is interactive. */
export const StickerOverlay = ({
  stickers,
  selectedId,
  onSelect,
  onMove,
  onResize,
  onRotate,
  onRemove,
  onBringToFront,
}: StickerOverlayProps) => (
  <div className="absolute inset-0 z-20 pointer-events-none">
    {stickers.map((s) => {
      const content = getStickerContent(s.stickerId);
      if (!content) return null;
      const name = s.stickerId.startsWith('emoji:')
        ? EMOJIS.find((e) => `emoji:${e.id}` === s.stickerId)?.name || 'Emoji'
        : s.stickerId.startsWith('gif:')
          ? GIFS.find((g) => `gif:${g.id}` === s.stickerId)?.name || 'Effect'
          : STICKERS.find((x) => x.id === s.stickerId)?.name || 'Sticker';
      const selected = s.id === selectedId;

      return (
        <div
          key={s.id}
          role="img"
          aria-label={name}
          className={`absolute select-none ${selected ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
            zIndex: s.z,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect(s.id);
            onBringToFront(s.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const origX = s.x;
            const origY = s.y;

            const onMoveEvent = (ev: PointerEvent) => {
              const dx = ev.clientX - startX;
              const dy = ev.clientY - startY;
              const area = document.getElementById('sticker-overlay-area');
              const w = area?.clientWidth || 360;
              const h = area?.clientHeight || 640;
              onMove(s.id, Math.min(100, Math.max(0, origX + (dx / w) * 100)), Math.min(100, Math.max(0, origY + (dy / h) * 100)));
            };
            const onUpEvent = () => {
              window.removeEventListener('pointermove', onMoveEvent);
              window.removeEventListener('pointerup', onUpEvent);
            };
            window.addEventListener('pointermove', onMoveEvent);
            window.addEventListener('pointerup', onUpEvent);
          }}
        >
          <div className="relative" style={{ width: 64, height: 64 }}>
            {content}
            {selected && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur px-1.5 py-1 pointer-events-auto">
                <button onClick={() => onResize(s.id, -0.15)} aria-label="Smaller" className="p-0.5 text-white/80 hover:text-white"><ZoomOut className="w-3 h-3" /></button>
                <button onClick={() => onResize(s.id, 0.15)} aria-label="Larger" className="p-0.5 text-white/80 hover:text-white"><ZoomIn className="w-3 h-3" /></button>
                <button onClick={() => onRotate(s.id, 15)} aria-label="Rotate" className="p-0.5 text-white/80 hover:text-white"><RotateCcw className="w-3 h-3" /></button>
                <button onClick={() => onRemove(s.id)} aria-label="Remove sticker" className="p-0.5 text-red-400 hover:text-red-300"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
);
