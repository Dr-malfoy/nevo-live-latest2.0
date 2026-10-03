import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function resolveExtension(originalname?: string, mimetype?: string): string {
  if (originalname) {
    const ext = path.extname(originalname).toLowerCase();
    if (ext && ext.length <= 6) return ext;
  }

  const mime = (mimetype || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('svg')) return '.svg';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('quicktime') || mime.includes('mov')) return '.mov';
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('m4a') || mime.includes('audio/mp4')) return '.m4a';

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
    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good' }],
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary image upload failed, using local storage fallback:', (error as Error).message);
      }
    }
    return this.saveLocal(filePath, originalname, mimetype);
  },

  async uploadVideo(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder,
          resource_type: 'video',
          eager: [{ streaming_profile: 'hd' }],
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary video upload failed, using local storage fallback:', (error as Error).message);
      }
    }
    return this.saveLocal(filePath, originalname, mimetype);
  },

  async uploadAudio(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder,
          resource_type: 'video', // Cloudinary handles audio files under 'video' resource_type
        });
        try {
          fs.unlinkSync(filePath);
        } catch {}
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary audio upload failed, using local storage fallback:', (error as Error).message);
      }
    }
    return this.saveLocal(filePath, originalname, mimetype);
  },

  async deleteFile(publicId: string): Promise<void> {
    try {
      if (env.cloudinary.cloudName && env.cloudinary.apiKey) {
        await cloudinary.uploader.destroy(publicId);
      }
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
    }
  },

  getPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
    return publicId;
  },
};
