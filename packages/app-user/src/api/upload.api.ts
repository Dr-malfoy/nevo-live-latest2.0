import client from './client';
import type { ApiResponse } from '../types';

export const uploadApi = {
  /** Upload an image/audio/video file. Returns the Cloudinary URL. */
  upload: async (file: Blob, folder = 'bogolive'): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const { data } = await client.post<ApiResponse<{ url: string }>>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success || !data.data?.url) throw new Error(data.error || 'Upload failed');
    return data.data.url;
  },
};
