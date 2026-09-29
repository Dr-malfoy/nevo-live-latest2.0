import { Request, Response, NextFunction } from 'express';
import { uploadService } from '../services/upload.service';
import { sendSuccess, sendError } from '../utils/response';

export const uploadController = {
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        sendError(res, 'No file provided', 400);
        return;
      }

      const isVideo = req.file.mimetype.startsWith('video/');
      const isAudio = req.file.mimetype.startsWith('audio/');
      const folder = req.body.folder || 'bogolive';

      let url: string;
      if (isAudio) {
        url = await uploadService.uploadAudio(req.file.path, folder, req.file.originalname, req.file.mimetype);
      } else if (isVideo) {
        url = await uploadService.uploadVideo(req.file.path, folder, req.file.originalname, req.file.mimetype);
      } else {
        url = await uploadService.uploadImage(req.file.path, folder, req.file.originalname, req.file.mimetype);
      }

      sendSuccess(res, { url }, 'File uploaded');
    } catch (error) {
      next(error);
    }
  },
};
