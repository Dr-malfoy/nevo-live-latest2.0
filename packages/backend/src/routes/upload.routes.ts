import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const upload = multer({ dest: os.tmpdir() });

const router = Router();

router.post('/', authenticate, upload.single('file'), uploadController.uploadFile);

export default router;
