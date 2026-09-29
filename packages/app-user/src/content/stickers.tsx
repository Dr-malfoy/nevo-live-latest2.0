import type { ReactNode } from 'react';

export interface StickerDef {
  id: string;
  category: 'cute' | 'fun' | 'celebration' | 'hearts' | 'stars' | 'party' | 'seasonal';
  name: string;
  /** Renders at 64px base; scalable via the transform in the overlay. */
  svg: ReactNode;
}

const S = ({ children, fill = '#F472B6' }: { children: ReactNode; fill?: string }) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    {children}
    <style>{`path,circle,ellipse,rect{fill:${fill}}`}</style>
  </svg>
);

/** Pure-SVG sticker library (no raster assets). Add more by extending this list. */
export const STICKERS: StickerDef[] = [
  // Cute
  { id: 'cute-cat', category: 'cute', name: 'Cute Cat', svg: <S fill="#F9A8D4"><circle cx="32" cy="34" r="20" /><path d="M22 14l-6-8 10 6 6-6 6 6 10-6-6 8z" /><circle cx="26" cy="34" r="2.5" fill="#1F2937" /><circle cx="38" cy="34" r="2.5" fill="#1F2937" /><path d="M28 42q4 4 8 0" stroke="#1F2937" strokeWidth="2" fill="none" /></S> },
  { id: 'cute-bear', category: 'cute', name: 'Cute Bear', svg: <S fill="#D4A373"><circle cx="32" cy="36" r="18" /><circle cx="18" cy="20" r="8" /><circle cx="46" cy="20" r="8" /><circle cx="26" cy="36" r="2.5" fill="#1F2937" /><circle cx="38" cy="36" r="2.5" fill="#1F2937" /><ellipse cx="32" cy="42" rx="4" ry="3" fill="#1F2937" /></S> },
  { id: 'cute-bunny', category: 'cute', name: 'Cute Bunny', svg: <S fill="#E5E7EB"><circle cx="32" cy="40" r="18" /><ellipse cx="22" cy="18" rx="6" ry="12" /><ellipse cx="42" cy="18" rx="6" ry="12" /><circle cx="26" cy="40" r="2.5" fill="#1F2937" /><circle cx="38" cy="40" r="2.5" fill="#1F2937" /><path d="M29 46q3 3 6 0" stroke="#1F2937" strokeWidth="2" fill="none" /></S> },
  { id: 'cute-panda', category: 'cute', name: 'Cute Panda', svg: <S fill="#F3F4F6"><circle cx="32" cy="36" r="20" /><circle cx="22" cy="28" r="7" fill="#1F2937" /><circle cx="42" cy="28" r="7" fill="#1F2937" /><circle cx="24" cy="29" r="3" fill="#fff" /><circle cx="40" cy="29" r="3" fill="#fff" /><circle cx="25" cy="30" r="1.5" fill="#1F2937" /><circle cx="39" cy="30" r="1.5" fill="#1F2937" /><ellipse cx="32" cy="42" rx="4" ry="3" fill="#1F2937" /></S> },
  { id: 'cute-fox', category: 'cute', name: 'Cute Fox', svg: <S fill="#FB923C"><path d="M32 14L20 6l2 12-6-4 2 12 14-12z" /><path d="M32 14l12-8-2 12 6-4-2 12-14-12z" /><circle cx="32" cy="36" r="18" /><circle cx="26" cy="36" r="2.5" fill="#1F2937" /><circle cx="38" cy="36" r="2.5" fill="#1F2937" /><path d="M28 44q4 3 8 0" stroke="#1F2937" strokeWidth="2" fill="none" /></S> },

  // Fun
  { id: 'fun-laugh', category: 'fun', name: 'Laughing', svg: <S fill="#FCD34D"><circle cx="32" cy="32" r="22" /><circle cx="25" cy="30" r="3" fill="#1F2937" /><circle cx="39" cy="30" r="3" fill="#1F2937" /><path d="M22 38q10 8 20 0" stroke="#1F2937" strokeWidth="2.5" fill="none" /></S> },
  { id: 'fun-cool', category: 'fun', name: 'Cool Shades', svg: <S fill="#60A5FA"><circle cx="32" cy="34" r="20" /><rect x="18" y="28" width="12" height="8" rx="3" fill="#1F2937" /><rect x="34" y="28" width="12" height="8" rx="3" fill="#1F2937" /><path d="M30 32h4" stroke="#1F2937" strokeWidth="2" /><path d="M24 40q8 4 16 0" stroke="#1F2937" strokeWidth="2" fill="none" /></S> },
  { id: 'fun-wink', category: 'fun', name: 'Wink', svg: <S fill="#FBBF24"><circle cx="32" cy="32" r="22" /><circle cx="25" cy="30" r="3" fill="#1F2937" /><path d="M34 30l6-3-6 3" stroke="#1F2937" strokeWidth="2.5" fill="none" /><path d="M26 40q6 5 12 0" stroke="#1F2937" strokeWidth="2.5" fill="none" /></S> },
  { id: 'fun-popcorn', category: 'fun', name: 'Popcorn', svg: <S fill="#FDE68A"><path d="M20 28h24l-3 24H23z" fill="#F59E0B" /><circle cx="24" cy="22" r="5" fill="#FEF3C7" /><circle cx="32" cy="18" r="6" fill="#FEF3C7" /><circle cx="40" cy="22" r="5" fill="#FEF3C7" /></S> },
  { id: 'fun-robot', category: 'fun', name: 'Robot', svg: <S fill="#94A3B8"><rect x="16" y="22" width="32" height="26" rx="6" /><rect x="22" y="12" width="6" height="10" /><rect x="36" y="12" width="6" height="10" /><circle cx="26" cy="34" r="3" fill="#1F2937" /><circle cx="38" cy="34" r="3" fill="#1F2937" /><rect x="28" y="40" width="8" height="3" rx="1.5" fill="#1F2937" /></S> },

  // Celebration
  { id: 'cel-trophy', category: 'celebration', name: 'Trophy', svg: <S fill="#FBBF24"><path d="M22 12h20v10a10 10 0 01-20 0z" /><rect x="26" y="22" width="12" height="8" fill="#F59E0B" /><path d="M28 30h8l-2 10h-4z" fill="#F59E0B" /><rect x="20" y="10" width="6" height="8" rx="2" /><rect x="38" y="10" width="6" height="8" rx="2" /></S> },
  { id: 'cel-cake', category: 'celebration', name: 'Cake', svg: <S fill="#F9A8D4"><rect x="16" y="30" width="32" height="14" rx="3" /><rect x="20" y="26" width="24" height="6" rx="2" fill="#F472B6" /><circle cx="22" cy="20" r="3" fill="#EF4444" /><circle cx="32" cy="18" r="3.5" fill="#F59E0B" /><circle cx="42" cy="20" r="3" fill="#EF4444" /><path d="M20 44h24v6H20z" fill="#F472B6" /></S> },
  { id: 'cel-firework', category: 'celebration', name: 'Firework', svg: <S fill="#A78BFA"><circle cx="32" cy="30" r="4" /><path d="M32 10v8M32 42v8M14 30h8M42 30h8M20 18l6 6M38 36l6 6M44 18l-6 6M26 36l-6 6" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" /></S> },
  { id: 'cel-balloon', category: 'celebration', name: 'Balloon', svg: <S fill="#F472B6"><ellipse cx="32" cy="26" rx="12" ry="16" /><path d="M32 42l-4 10h8z" /><path d="M30 50q-6 4-2 8" stroke="#94A3B8" strokeWidth="2" fill="none" /></S> },
  { id: 'cel-party-hat', category: 'celebration', name: 'Party Hat', svg: <S fill="#34D399"><path d="M16 44h32L32 12z" /><circle cx="32" cy="22" r="2.5" fill="#fff" /><circle cx="26" cy="32" r="2.5" fill="#fff" /><circle cx="38" cy="32" r="2.5" fill="#fff" /><circle cx="32" cy="40" r="3" fill="#fff" /></S> },

  // Hearts
  { id: 'heart-pink', category: 'hearts', name: 'Pink Heart', svg: <S fill="#F472B6"><path d="M32 52C14 40 6 30 6 20a12 12 0 0122-6 12 12 0 0122 6c0 10-8 20-18 32z" /></S> },
  { id: 'heart-red', category: 'hearts', name: 'Red Heart', svg: <S fill="#EF4444"><path d="M32 52C14 40 6 30 6 20a12 12 0 0122-6 12 12 0 0122 6c0 10-8 20-18 32z" /></S> },
  { id: 'heart-sparkle', category: 'hearts', name: 'Sparkle Heart', svg: <S fill="#F472B6"><path d="M32 50C16 39 8 30 8 21a10 10 0 0119-5 10 10 0 0119 5c0 9-8 18-14 29z" /><path d="M44 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FBBF24" /></S> },
  { id: 'heart-broken', category: 'hearts', name: 'Broken Heart', svg: <S fill="#EF4444"><path d="M32 50C16 39 8 30 8 21a10 10 0 0119-5 10 10 0 0119 5c0 9-8 18-14 29z" /><path d="M28 22l-6 8 8 2-8 10" stroke="#0B0B0F" strokeWidth="3" fill="none" /></S> },

  // Stars
  { id: 'star-gold', category: 'stars', name: 'Gold Star', svg: <S fill="#FBBF24"><path d="M32 4l8 18 20 2-15 13 5 20-18-10-18 10 5-20L4 24l20-2z" /></S> },
  { id: 'star-shine', category: 'stars', name: 'Shine Star', svg: <S fill="#FCD34D"><path d="M32 6l7 16 18 2-13 12 4 18-16-10-16 10 4-18L7 24l18-2z" /><circle cx="48" cy="12" r="3" fill="#A78BFA" /><circle cx="16" cy="10" r="2" fill="#60A5FA" /></S> },
  { id: 'star-twinkle', category: 'stars', name: 'Twinkle', svg: <S fill="#A78BFA"><path d="M32 8l5 12 13 2-9 9 2 13-11-6-11 6 2-13-9-9 13-2z" /><path d="M50 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FBBF24" /></S> },

  // Party
  { id: 'party-confetti', category: 'party', name: 'Confetti', svg: <S fill="#34D399"><rect x="12" y="18" width="8" height="8" rx="2" transform="rotate(-15 16 22)" /><rect x="26" y="12" width="8" height="8" rx="2" transform="rotate(20 30 16)" fill="#F472B6" /><rect x="40" y="18" width="8" height="8" rx="2" transform="rotate(-10 44 22)" fill="#FBBF24" /><rect x="18" y="36" width="8" height="8" rx="2" transform="rotate(12 22 40)" fill="#60A5FA" /><rect x="34" y="38" width="8" height="8" rx="2" transform="rotate(-18 38 42)" fill="#F472B6" /></S> },
  { id: 'party-mask', category: 'party', name: 'Party Mask', svg: <S fill="#A78BFA"><path d="M14 30a18 12 0 0136 0l-4 10a6 6 0 01-8 2l-2-2-2 2a6 6 0 01-8-2z" /><circle cx="26" cy="32" r="3" fill="#1F2937" /><circle cx="38" cy="32" r="3" fill="#1F2937" /><path d="M10 28l4 4M54 28l-4 4" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" /></S> },
  { id: 'party-streamer', category: 'party', name: 'Streamer', svg: <S fill="#F472B6"><path d="M14 16c8 2 10 8 4 12s-4 10 6 12 8 8 0 10" stroke="#F472B6" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M30 16c8 2 10 8 4 12" stroke="#FBBF24" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M40 40c6 2 8 6 2 8" stroke="#34D399" strokeWidth="4" fill="none" strokeLinecap="round" /></S> },

  // Seasonal
  { id: 'season-snow', category: 'seasonal', name: 'Snowflake', svg: <S fill="#93C5FD"><path d="M32 8v48M14 20l36 24M50 20L14 44M32 8l-6 6M32 8l6 6M32 56l-6-6M32 56l6-6M14 20l8 2M14 20l2 8M50 20l-8 2M50 20l-2 8M14 44l8-2M14 44l2-8M50 44l-8-2M50 44l-2-8" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" /></S> },
  { id: 'season-sun', category: 'seasonal', name: 'Sun', svg: <S fill="#FBBF24"><circle cx="32" cy="32" r="14" /><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" /></S> },
  { id: 'season-leaf', category: 'seasonal', name: 'Leaf', svg: <S fill="#34D399"><path d="M52 12C30 14 12 32 12 52c20 0 38-18 40-40z" /><path d="M16 48c8-10 16-16 28-22" stroke="#0B0B0F" strokeWidth="2" fill="none" opacity="0.3" /></S> },
];

export const STICKER_CATEGORIES = [...new Set(STICKERS.map((s) => s.category))] as StickerDef['category'][];

export const CATEGORY_LABELS: Record<StickerDef['category'], string> = {
  cute: 'Cute',
  fun: 'Fun',
  celebration: 'Celebration',
  hearts: 'Hearts',
  stars: 'Stars',
  party: 'Party',
  seasonal: 'Seasonal',
};

/* ─── Emoji set (rendered as large text glyphs) ──────────────── */
export interface EmojiDef {
  id: string;
  name: string;
  glyph: string;
}

export const EMOJIS: EmojiDef[] = [
  { id: 'heart', name: 'Red Heart', glyph: '❤️' },
  { id: 'fire', name: 'Fire', glyph: '🔥' },
  { id: 'laugh', name: 'Laugh', glyph: '😂' },
  { id: 'love-eyes', name: 'Love Eyes', glyph: '😍' },
  { id: 'thumbs', name: 'Thumbs Up', glyph: '👍' },
  { id: 'party', name: 'Party', glyph: '🎉' },
  { id: 'party-face', name: 'Party Face', glyph: '🥳' },
  { id: 'sparkle-heart', name: 'Sparkle Heart', glyph: '💖' },
  { id: 'cool', name: 'Cool', glyph: '😎' },
  { id: 'star-struck', name: 'Star Struck', glyph: '🤩' },
  { id: 'cry', name: 'Cry', glyph: '😭' },
  { id: 'kiss', name: 'Kiss', glyph: '😘' },
  { id: 'applause', name: 'Applause', glyph: '👏' },
  { id: 'pray', name: 'Pray', glyph: '🙏' },
  { id: 'sparkles', name: 'Sparkles', glyph: '✨' },
  { id: 'hundred', name: 'Hundred', glyph: '💯' },
  { id: 'angry', name: 'Angry', glyph: '😡' },
  { id: 'sleepy', name: 'Sleepy', glyph: '😴' },
  { id: 'thinking', name: 'Thinking', glyph: '🤔' },
  { id: 'dog', name: 'Dog', glyph: '🐶' },
  { id: 'cat', name: 'Cat', glyph: '🐱' },
  { id: 'rose', name: 'Rose', glyph: '🌹' },
  { id: 'wave', name: 'Wave', glyph: '👋' },
  { id: 'muscle', name: 'Muscle', glyph: '💪' },
];

/* ─── Animated GIF-style effects (pure animated SVG, no raster) ─ */
export interface GifDef {
  id: string;
  name: string;
  svg: ReactNode;
}

const G = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
    {children}
    <style>{`
      .gif-pulse{animation:gifPulse 1s ease-in-out infinite}
      .gif-pulse2{animation:gifPulse 1s .2s ease-in-out infinite}
      .gif-float{animation:gifFloat 1.4s ease-in-out infinite}
      .gif-float2{animation:gifFloat 1.4s .25s ease-in-out infinite}
      .gif-float3{animation:gifFloat 1.4s .5s ease-in-out infinite}
      .gif-spin{animation:gifSpin 2.4s linear infinite; transform-origin:32px 32px}
      .gif-blink{animation:gifBlink .9s step-end infinite}
      @keyframes gifPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}
      @keyframes gifFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes gifSpin{to{transform:rotate(360deg)}}
      @keyframes gifBlink{50%{opacity:.25}}
    `}</style>
  </svg>
);

export const GIFS: GifDef[] = [
  {
    id: 'gif-fire',
    name: 'Fire Burst',
    svg: (
      <G>
        <g className="gif-pulse">
          <path d="M32 8c6 10 4 14 0 20s-10 12-6 22c-8-4-10-12-6-18C14 20 24 16 32 8z" fill="#F97316" />
          <path d="M32 8c4 8 2 12-2 16-4-2-6-6-4-12 2 2 4 4 6-4z" fill="#FBBF24" />
        </g>
        <g className="gif-pulse2">
          <path d="M20 46l-3 6M44 46l3 6" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" />
        </g>
      </G>
    ),
  },
  {
    id: 'gif-love',
    name: 'Floating Hearts',
    svg: (
      <G>
        <path className="gif-float" d="M32 20C24 12 12 18 12 28a10 10 0 0020 5 10 10 0 0020-5c0-10-12-16-20-8z" fill="#EF4444" />
        <path className="gif-float2" opacity="0.8" d="M16 40c-4-6-10-2-10 4a6 6 0 0012 0c0-6-2-7-2-4z" fill="#F472B6" transform="translate(0 -4)" />
        <path className="gif-float3" opacity="0.8" d="M50 44c4-6 10-2 10 4a6 6 0 01-12 0c0-6 2-7 2-4z" fill="#F9A8D4" transform="translate(-2 -4)" />
      </G>
    ),
  },
  {
    id: 'gif-star',
    name: 'Shooting Star',
    svg: (
      <G>
        <g className="gif-spin">
          <path d="M32 10l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill="#FBBF24" />
        </g>
        <path className="gif-blink" d="M10 52l8-2M8 46l4-2M14 56l4 2" stroke="#FCD34D" strokeWidth="3" strokeLinecap="round" />
      </G>
    ),
  },
  {
    id: 'gif-rainbow',
    name: 'Rainbow',
    svg: (
      <G>
        <g>
          <path d="M10 48a22 22 0 0144 0" stroke="#EF4444" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M16 48a16 16 0 0132 0" stroke="#FBBF24" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M22 48a10 10 0 0120 0" stroke="#34D399" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
        <path className="gif-blink" d="M32 52l3 6M32 52l-3 6" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
      </G>
    ),
  },
  {
    id: 'gif-clap',
    name: 'Clapping',
    svg: (
      <G>
        <g className="gif-float">
          <path d="M26 14l4 4-8 8 6 6-6 6-6-6-4 4-2-2 10-10z" fill="#FBBF24" />
          <path d="M40 14l-4 4 8 8-6 6 6 6 6-6 4 4 2-2-10-10z" fill="#F87171" />
        </g>
        <path className="gif-blink" d="M26 50h12M20 46h6M38 46h6" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" />
      </G>
    ),
  },
];

/* ─── Unified resolver — returns the renderable node for any placed content ─── */
export function getStickerContent(id: string): ReactNode {
  if (id.startsWith('emoji:')) {
    const e = EMOJIS.find((x) => `emoji:${x.id}` === id);
    return e ? <span style={{ fontSize: 56, lineHeight: 1 }}>{e.glyph}</span> : null;
  }
  if (id.startsWith('gif:')) {
    const g = GIFS.find((x) => `gif:${x.id}` === id);
    return g ? g.svg : null;
  }
  const def = STICKERS.find((s) => s.id === id);
  return def ? def.svg : null;
}
