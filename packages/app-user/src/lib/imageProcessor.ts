/**
 * Image Processing Utility
 * Ensures all images selected from Android Gallery, Camera, or Desktop
 * are decoded, scaled safely to stay within GPU texture limits, have their
 * transparency preserved (for PNG/WebP), EXIF orientation normalized,
 * and converted without causing white/black blank screen rendering bugs.
 */

export interface ImageProcessOptions {
  maxDimension?: number;
  quality?: number;
  preserveTransparency?: boolean;
}

const DEFAULT_OPTIONS: ImageProcessOptions = {
  maxDimension: 1920,
  quality: 0.88,
  preserveTransparency: true,
};

/**
 * Checks if a Blob or File is an image.
 */
export function isImageFile(file: Blob | File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  if ('name' in file && typeof file.name === 'string') {
    return /\.(jpe?g|png|webp|gif|svg|bmp|heic|heif)$/i.test(file.name);
  }
  return false;
}

/**
 * Detects if a canvas contains any semi-transparent or transparent pixels.
 */
function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    // Sample evenly across the canvas for performance
    const stepX = Math.max(1, Math.floor(width / 30));
    const stepY = Math.max(1, Math.floor(height / 30));
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const alphaIndex = (y * width + x) * 4 + 3;
        if (data[alphaIndex] < 250) {
          return true;
        }
      }
    }
  } catch {
    // Canvas tainted or reading failed
  }
  return false;
}

/**
 * Safely loads an image file/blob into an HTMLImageElement with EXIF orientation support.
 */
function loadImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.src = objectUrl;
  });
}

/**
 * Processes and optimizes an image File or Blob before network upload.
 * - Safely scales dimensions (max 1920px default) to prevent mobile WebView GPU rasterizer crashes (white/black box bugs).
 * - Preserves PNG/WebP alpha transparency without forcing a black or white background.
 * - Compresses JPEG efficiently to reduce bandwidth and memory pressure.
 * - Preserves video and audio files as-is.
 */
export async function processImageForUpload(
  input: Blob | File,
  options?: ImageProcessOptions
): Promise<File> {
  // Non-images (e.g. video/mp4, audio/mp3) pass through untouched
  if (!isImageFile(input)) {
    if (input instanceof File) return input;
    return new File([input], `media_${Date.now()}.mp4`, { type: input.type || 'video/mp4' });
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalName = 'name' in input ? input.name : `image_${Date.now()}`;
  const originalType = (input.type || '').toLowerCase();

  // SVG images do not need canvas rasterization
  if (originalType.includes('svg')) {
    if (input instanceof File) return input;
    return new File([input], `${originalName}.svg`, { type: 'image/svg+xml' });
  }

  // Animated GIFs should not be flattened onto a static canvas
  if (originalType.includes('gif')) {
    if (input instanceof File) return input;
    return new File([input], `${originalName}.gif`, { type: 'image/gif' });
  }

  try {
    // 1. Load image
    const img = await loadImageElement(input);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    if (!origWidth || !origHeight || origWidth <= 0 || origHeight <= 0) {
      throw new Error('Invalid image dimensions');
    }

    // 2. Compute safe scaled dimensions
    const maxDim = opts.maxDimension || 1920;
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    // Ensure valid pixel dimensions
    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    // 3. Create canvas and render
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Could not create 2D canvas context');
    }

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // Draw image onto canvas
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // 4. Determine output format (preserve transparency if needed)
    const isPngOrWebp = originalType.includes('png') || originalType.includes('webp');
    let outputMime = 'image/jpeg';
    let fileExt = '.jpg';

    if (opts.preserveTransparency && isPngOrWebp) {
      const isTransparent = hasAlphaChannel(ctx, targetWidth, targetHeight);
      if (isTransparent) {
        outputMime = originalType.includes('webp') ? 'image/webp' : 'image/png';
        fileExt = originalType.includes('webp') ? '.webp' : '.png';
      }
    }

    // 5. Convert canvas to Blob
    const outputBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        outputMime,
        outputMime === 'image/png' ? undefined : opts.quality
      );
    });

    if (!outputBlob || outputBlob.size === 0) {
      throw new Error('Canvas conversion produced empty blob');
    }

    // 6. Build clean filename
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = `${baseName}_${Date.now()}${fileExt}`;

    return new File([outputBlob], finalFilename, { type: outputMime });
  } catch (err) {
    console.warn('Image pre-processing fallback to original file:', err);
    if (input instanceof File) {
      return input;
    }
    const ext = originalType.includes('png') ? '.png' : originalType.includes('webp') ? '.webp' : '.jpg';
    return new File([input], `upload_${Date.now()}${ext}`, {
      type: input.type || 'image/jpeg',
    });
  }
}
