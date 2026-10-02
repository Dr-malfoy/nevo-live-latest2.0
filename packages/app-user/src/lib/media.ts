import { Capacitor } from '@capacitor/core';

/**
 * Resolves any media URL (image, video, avatar, audio) into a fully accessible URL.
 * Handles relative paths (/uploads/...), blob/data URLs, and absolute remote URLs.
 */
export function getMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Previews or inline data URLs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // Environment API URL (e.g. https://nevo-live-latest.onrender.com/api or http://localhost:5000/api)
  const envApi = import.meta.env.VITE_API_URL;
  if (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
    const origin = envApi.replace(/\/api\/?$/, '');
    return `${origin}${cleanPath}`;
  }

  // Native mobile app platform
  if (Capacitor.isNativePlatform()) {
    return `https://nevo-live-latest.onrender.com${cleanPath}`;
  }

  return cleanPath;
}
