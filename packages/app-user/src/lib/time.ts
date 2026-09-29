/**
 * Short relative time — "just now", "5m", "2h", "3d".
 * Used for the visitor list (requirement #2: "Time Dekhabe Kotokhon Age Visit Korse").
 */
export function timeAgo(value?: string | Date | null): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return new Date(value).toLocaleDateString();
}

/** Compact count: 1234 → 1.2K, 1500000 → 1.5M. */
export function compactNumber(value?: number | null): string {
  const n = value ?? 0;
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * First visible character of a nickname, for avatar fallbacks.
 *
 * `charAt(0)` splits an emoji's surrogate pair and renders a replacement box
 * instead of a letter — common here,
 * since plenty of nicknames start with one. Array.from walks code points.
 */
export function initial(nickname?: string | null): string {
  const first = Array.from((nickname ?? '').trim())[0];
  return first ? first.toUpperCase() : '?';
}
