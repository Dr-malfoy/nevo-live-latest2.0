import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticate } from '../middleware/auth';
import { requireFaceVerified } from '../middleware/roleGuard';

const router = Router();

router.get('/', roomController.listRooms);
router.get('/feed', roomController.getFeed);
router.post('/', authenticate, requireFaceVerified, roomController.createRoom);
router.delete('/:id', authenticate, roomController.closeRoom);
router.post('/:id/close', authenticate, roomController.closeRoom);
router.get('/:id', roomController.getRoom);
router.post('/:id/join', authenticate, roomController.joinRoom);
router.post('/:id/leave', authenticate, roomController.leaveRoom);
router.post('/:id/seats/:index/sit', authenticate, roomController.sit);
router.post('/:id/seats/:index/stand', authenticate, roomController.stand);
router.post('/:id/seats/:index/kick', authenticate, roomController.kickMember);
router.post('/:id/seats/:index/lock', authenticate, roomController.lockSeat);
router.post('/:id/seats/:index/mute', authenticate, roomController.muteSeat);
router.post('/:id/admins', authenticate, roomController.setAdmin);

export default router;
