import { Capacitor } from '@capacitor/core';

export interface MediaUrlOptions {
  /** Optional cache busting key (e.g. timestamp or version string) */
  cacheBust?: string | number | boolean;
}

/**
 * Resolves any media URL (image, video, avatar, audio) into a fully accessible URL.
 * Handles relative paths (/uploads/...), blob/data URLs, and absolute remote URLs (Cloudinary, S3).
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

  let finalUrl = trimmed;

  // Already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    finalUrl = trimmed;
  } else {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    // 1. If explicit environment API URL is configured (e.g. https://nevo-live-latest.onrender.com/api)
    const envApi = import.meta.env.VITE_API_URL;
    if (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
      const origin = envApi.replace(/\/api\/?$/, '');
      finalUrl = `${origin}${cleanPath}`;
    } else if (Capacitor.isNativePlatform()) {
      // 2. Native mobile app platform (Android APK / iOS)
      finalUrl = `https://nevo-live-latest.onrender.com${cleanPath}`;
    } else {
      // 3. Web environment (Vite proxy forwards /uploads to http://localhost:5000 in dev)
      finalUrl = cleanPath;
    }
  }

  if (options?.cacheBust && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:')) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    const bustValue = typeof options.cacheBust === 'boolean' ? Date.now() : options.cacheBust;
    return `${finalUrl}${separator}t=${bustValue}`;
  }

  return finalUrl;
}
