import { Router } from 'express';
import { noteController } from '../controllers/note.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', noteController.getActiveNotes);
router.post('/', noteController.createOrUpdateNote);
router.delete('/', noteController.deleteNote);

export default router;
