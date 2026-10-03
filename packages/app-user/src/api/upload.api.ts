import client from './client';
import type { ApiResponse } from '../types';
import { processImageForUpload, isImageFile } from '../lib/imageProcessor';

export const uploadApi = {
  /**
   * Upload an image, audio, or video file.
   * Automatically optimizes and normalizes images to ensure they display properly across all devices.
   */
  upload: async (file: Blob | File, folder = 'bogolive'): Promise<string> => {
    let processedFile: File;

    if (isImageFile(file)) {
      processedFile = await processImageForUpload(file, {
        maxDimension: 1920,
        quality: 0.88,
        preserveTransparency: true,
      });
    } else if (file instanceof File) {
      processedFile = file;
    } else {
      processedFile = new File([file], `media_${Date.now()}.mp4`, {
        type: file.type || 'application/octet-stream',
      });
    }

    const form = new FormData();
    form.append('file', processedFile, processedFile.name);
    form.append('folder', folder);

    const { data } = await client.post<ApiResponse<{ url: string }>>('/upload', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!data.success || !data.data?.url) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.data.url;
  },
};
