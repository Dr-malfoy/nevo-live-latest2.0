import { Capacitor } from '@capacitor/core';

export interface MediaUrlOptions {
  /** Optional cache busting key (e.g. timestamp or version string) */
  cacheBust?: string | number | boolean;
}

/**
 * Resolves any media URL (image, video, avatar, audio) into a fully accessible URL.
 * Handles relative paths (/uploads/...), blob/data URLs, and absolute remote URLs (Cloudinary, S3, Render).
 * Automatically migrates localhost/127.0.0.1 URLs to the configured remote backend.
 * Ensures both Android APK and Web environments load the correct resource.
 */
export function getMediaUrl(url?: string | null, options?: MediaUrlOptions): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';

  // Previews or inline data URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Determine active backend origin
  const envApi = import.meta.env.VITE_API_URL;
  const remoteOrigin = (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://')))
    ? envApi.replace(/\/api\/?$/, '')
    : 'https://nevo-live-latest.onrender.com';

  let finalUrl = trimmed;

  // If URL points to localhost or 127.0.0.1, rewrite to the active remote origin
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(trimmed)) {
    finalUrl = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, remoteOrigin);
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Already an absolute remote URL (e.g. S3, Cloudinary, Render)
    finalUrl = trimmed;
  } else {
    // Relative path (e.g. /uploads/... or uploads/...)
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    finalUrl = `${remoteOrigin}${cleanPath}`;
  }

  if (
    options?.cacheBust &&
    !finalUrl.startsWith('data:') &&
    !finalUrl.startsWith('blob:') &&
    !finalUrl.includes('googleusercontent.com') &&
    !finalUrl.includes('ggpht.com')
  ) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    const bustValue = typeof options.cacheBust === 'boolean' ? Date.now() : options.cacheBust;
    return `${finalUrl}${separator}t=${bustValue}`;
  }

  return finalUrl;
}
