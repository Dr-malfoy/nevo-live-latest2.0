import { Router } from 'express';
import { storyController } from '../controllers/story.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', storyController.getActiveStories);
router.post('/', storyController.createStory);
router.post('/:storyId/view', storyController.viewStory);
router.delete('/:storyId', storyController.deleteStory);

export default router;
