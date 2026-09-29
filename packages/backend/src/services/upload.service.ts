import fs from 'fs';
import path from 'path';
import cloudinary from '../config/cloudinary';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const uploadService = {
  async saveLocal(filePath: string, originalname?: string, mimetype?: string): Promise<string> {
    try {
      const ext = originalname
        ? path.extname(originalname)
        : mimetype?.includes('png')
        ? '.png'
        : mimetype?.includes('webp')
        ? '.webp'
        : mimetype?.includes('mp4')
        ? '.mp4'
        : '.jpg';
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
        });
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary upload failed, using local storage fallback:', (error as Error).message);
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
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary upload failed, using local storage fallback:', (error as Error).message);
      }
    }
    return this.saveLocal(filePath, originalname, mimetype);
  },

  async uploadAudio(filePath: string, folder: string = 'bogolive', originalname?: string, mimetype?: string): Promise<string> {
    if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
      try {
        const result = await cloudinary.uploader.upload(filePath, {
          folder,
          resource_type: 'video', // Cloudinary treats audio as 'video' resource type
        });
        return result.secure_url;
      } catch (error) {
        console.warn('Cloudinary upload failed, using local storage fallback:', (error as Error).message);
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

