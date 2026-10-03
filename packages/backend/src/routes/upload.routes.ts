import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, os.tmpdir());
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  const isImage =
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg|bmp|heic|heif)$/i.test(name);
  const isVideo =
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|mkv|avi|3gp)$/i.test(name);
  const isAudio =
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(name);

  if (isImage || isVideo || isAudio) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload an image, video, or audio file.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB max
  },
  fileFilter,
});

const router = Router();

router.post(
  '/',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size exceeds 60MB limit',
            });
          }
          return res.status(400).json({
            success: false,
            error: `Upload error: ${err.message}`,
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload rejected',
        });
      }
      next();
    });
  },
  uploadController.uploadFile
);

export default router;
