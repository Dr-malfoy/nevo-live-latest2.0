import { Capacitor } from '@capacitor/core';

export interface MediaUrlOptions {
  /** Optional cache busting key (e.g. timestamp or version string) */
  cacheBust?: string | number | boolean;
  /** Request full original / uncropped / high-resolution image instead of thumbnail */
  highRes?: boolean;
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

  if (options?.highRes) {
    return getOriginalMediaUrl(trimmed);
  }

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

/**
 * Resolves any media URL to its original, uncropped, maximum-resolution version.
 * - Upgrades Google profile pictures from cropped thumbnails (=s96-c, =w...-h...-c) to the full-size uncropped original upload (=s0)
 * - Removes 1:1 crop constraints from Unsplash images (fit=crop -> uncropped full-res)
 * - Removes Cloudinary thumbnail/crop transformations (c_crop, c_fill, w_..., h_...)
 * - Upgrades Facebook graph avatar thumbnails to large uncropped version
 */
export function getOriginalMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';

  // Base resolution via standard getMediaUrl to guarantee valid backend origin / protocol
  const base = getMediaUrl(trimmed);
  if (!base) return '';

  // Previews or inline data URLs
  if (base.startsWith('data:') || base.startsWith('blob:')) {
    return base;
  }

  let highRes = base;

  // 1. Google OAuth / Google Photos / Google User Content CDN:
  // e.g. https://lh3.googleusercontent.com/a/...=s96-c
  // `=s0` returns the original uncropped full-resolution photo uploaded by the user.
  if (/googleusercontent\.com|ggpht\.com/i.test(highRes)) {
    if (/=[sw]\d+.*$/i.test(highRes)) {
      return highRes.replace(/=[sw]\d+.*$/i, '=s0');
    }
    if (!highRes.includes('=s0')) {
      const sep = highRes.includes('?') ? '&' : (highRes.includes('=') ? '' : '=');
      return sep === '=' ? `${highRes}=s0` : `${highRes}${sep}sz=0`;
    }
    return highRes;
  }

  // 2. Unsplash images:
  // e.g. https://images.unsplash.com/photo-...?auto=format&fit=crop&w=256&q=80
  // Remove fit=crop and w=\d+ so it restores the original photo's aspect ratio and resolution
  if (/images\.unsplash\.com/i.test(highRes)) {
    try {
      const u = new URL(highRes);
      u.searchParams.delete('fit');
      u.searchParams.delete('crop');
      u.searchParams.delete('w');
      u.searchParams.delete('h');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('q', '90');
      return u.toString();
    } catch {
      return highRes
        .replace(/([?&])fit=crop(&|$)/i, '$1')
        .replace(/([?&])w=\d+(&|$)/i, '$1')
        .replace(/([?&])h=\d+(&|$)/i, '$1')
        .replace(/[?&]&+/g, '&')
        .replace(/[?&]$/, '');
    }
  }

  // 3. Cloudinary images:
  // e.g. res.cloudinary.com/.../image/upload/c_crop,w_256,h_256/... or /c_fill,g_face,w_200,h_200/...
  // Remove crop & resize transformation segments to fetch the original uploaded file
  if (/res\.cloudinary\.com/i.test(highRes)) {
    return highRes.replace(
      /\/image\/upload\/(?:c_[a-z0-9_]+|w_\d+|h_\d+|g_[a-z0-9_]+|r_[a-z0-9_]+|,)+(\/v\d+)?/i,
      '/image/upload$1'
    );
  }

  // 4. Facebook graph avatar:
  if (/graph\.facebook\.com/i.test(highRes)) {
    try {
      const u = new URL(highRes);
      u.searchParams.set('type', 'large');
      u.searchParams.set('width', '1080');
      u.searchParams.set('height', '1080');
      return u.toString();
    } catch {
      return highRes;
    }
  }

  return highRes;
}
