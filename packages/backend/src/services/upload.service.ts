import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function resolveTargetFolder(folder?: string): string {
  if (!folder || folder === 'bogolive' || folder === 'uploads') {
    return 'bogolive/uploads';
  }
  if (folder.startsWith('bogolive/')) {
    return folder;
  }
  return `bogolive/${folder}`;
}

function resolveExtension(originalname?: string, mimetype?: string): string {
  if (originalname) {
    const ext = path.extname(originalname).toLowerCase();
    if (ext && ext.length >= 2 && ext.length <= 6) return ext;
  }

  const mime = (mimetype || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('audio/mp4') || mime.includes('m4a') || mime.includes('aac')) return '.m4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('quicktime') || mime.includes('mov')) return '.mov';

  return '.jpg';
}

export const uploadService = {
  async saveLocal(filePath: string, originalname?: string, mimetype?: string): Promise<string> {
    try {
      const ext = resolveExtension(originalname, mimetype);
      const filename = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      const dest = path.join(UPLOADS_DIR, filename);

      fs.copyFileSync(filePath, dest);
      try {
        fs.unlinkSync(filePath);
      } catch {}

      return `/uploads/${filename}`;
    } catch (e) {
      console.error('Local file save failed:', e);
      throw new AppError('Failed to save uploaded file', 500);
    }
  },

  async uploadImage(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    const targetFolder = resolveTargetFolder(folder);

    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: targetFolder,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error: any) {
        console.error('❌ Cloudinary image upload failed:', error?.message || error);
        if (env.nodeEnv === 'production') {
          try {
            fs.unlinkSync(filePath);
          } catch {}
          throw new AppError(`Failed to upload image to Cloudinary: ${error?.message || 'Upload error'}`, 500);
        }
        console.warn('⚠️ Falling back to local storage (Development only)...');
      }
    } else if (env.nodeEnv === 'production') {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      throw new AppError('Cloudinary is not configured in production environment variables. Image upload aborted.', 500);
    }

    return this.saveLocal(filePath, originalname, mimetype);
  },

  async uploadVideo(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    const targetFolder = resolveTargetFolder(folder);

    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: targetFolder,
          resource_type: 'video',
          eager: [{ streaming_profile: 'hd' }],
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error: any) {
        console.error('❌ Cloudinary video upload failed:', error?.message || error);
        if (env.nodeEnv === 'production') {
          try {
            fs.unlinkSync(filePath);
          } catch {}
          throw new AppError(`Failed to upload video to Cloudinary: ${error?.message || 'Upload error'}`, 500);
        }
        console.warn('⚠️ Falling back to local storage (Development only)...');
      }
    } else if (env.nodeEnv === 'production') {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      throw new AppError('Cloudinary is not configured in production environment variables. Video upload aborted.', 500);
    }

    return this.saveLocal(filePath, originalname, mimetype);
  },

  async uploadAudio(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    const targetFolder = resolveTargetFolder(folder);

    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder: targetFolder,
          resource_type: 'video', // Cloudinary handles audio files under 'video' resource_type
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error: any) {
        console.error('❌ Cloudinary audio upload failed:', error?.message || error);
        if (env.nodeEnv === 'production') {
          try {
            fs.unlinkSync(filePath);
          } catch {}
          throw new AppError(`Failed to upload audio to Cloudinary: ${error?.message || 'Upload error'}`, 500);
        }
        console.warn('⚠️ Falling back to local storage (Development only)...');
      }
    } else if (env.nodeEnv === 'production') {
      try {
        fs.unlinkSync(filePath);
      } catch {}
      throw new AppError('Cloudinary is not configured in production environment variables. Audio upload aborted.', 500);
    }

    return this.saveLocal(filePath, originalname, mimetype);
  },

  async deleteFile(publicIdOrUrl: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      if (!env.cloudinary.cloudName || !env.cloudinary.apiKey) return;
      const publicId = publicIdOrUrl.startsWith('http')
        ? this.getPublicIdFromUrl(publicIdOrUrl)
        : publicIdOrUrl;
      if (!publicId) return;
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
    }
  },

  getPublicIdFromUrl(url: string): string {
    if (!url) return '';
    const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    if (match) return match[1];

    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const fileNameWithoutExt = fileWithExt.split('.')[0];
    return folder ? `${folder}/${fileNameWithoutExt}` : fileNameWithoutExt;
  },
};
