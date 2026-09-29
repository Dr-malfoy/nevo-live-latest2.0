// Provably-fair verification (WebCrypto — mirrors backend sha256 + seedToIndex).

import { POCKET_COUNT } from './wheel';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Deterministic wheel index from a seed (must match backend seedToIndex). */
export function seedToIndex(seed: string): number {
  return parseInt(seed.slice(0, 8), 16) % POCKET_COUNT;
}

/** Verify a round: hash(seed) === committed hash AND seedToIndex(seed) === winningIndex. */
export async function verifyRound(seed: string, hash: string, winningIndex: number): Promise<boolean> {
  try {
    const digest = await sha256Hex(seed);
    return digest === hash && seedToIndex(seed) === winningIndex;
  } catch {
    return false;
  }
}
