export const BACKEND_PROD_URL = 'https://nevo-live-latest.onrender.com';

/**
 * Resolves any media URL (image, avatar, document, NID card photo) into a fully accessible URL.
 * Handles relative paths (/uploads/..., uploads/...), base64 data URIs, raw base64 strings, and absolute URLs.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  let trimmed = String(url).trim();
  if (!trimmed) return '';

  // Data URLs or blob URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Raw base64 strings without data: prefix
  if (trimmed.startsWith('/9j/') || trimmed.startsWith('iVBORw0KGgo')) {
    const mime = trimmed.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${trimmed}`;
  }

  // Normalize Windows-style backslashes (e.g. \uploads\file.jpg)
  trimmed = trimmed.replace(/\\/g, '/');

  // Already absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // If VITE_API_URL or environment variable is set
  const envApi = (import.meta as any).env?.VITE_API_URL;
  if (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
    const origin = envApi.replace(/\/api\/?$/, '');
    return `${origin}${cleanPath}`;
  }

  // Default to production backend where uploaded files are hosted
  return `${BACKEND_PROD_URL}${cleanPath}`;
}

/**
 * Returns an ordered array of candidate URLs to attempt loading an image from.
 * Helps ensure seamless fallback if an image is hosted on production Render, local backend (port 5000), or Vite proxy.
 */
export function getMediaCandidates(url?: string | null): string[] {
  if (!url) return [];
  const primary = getMediaUrl(url);
  if (!primary) return [];

  if (primary.startsWith('data:') || primary.startsWith('blob:')) {
    return [primary];
  }

  let trimmed = String(url).trim().replace(/\\/g, '/');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  const candidates: string[] = [primary];

  if (primary.startsWith(BACKEND_PROD_URL)) {
    candidates.push(`http://localhost:5000${cleanPath}`);
    candidates.push(cleanPath);
  } else if (primary.startsWith('http://localhost:5000') || primary === cleanPath) {
    candidates.push(`${BACKEND_PROD_URL}${cleanPath}`);
  }

  return Array.from(new Set(candidates));
}
