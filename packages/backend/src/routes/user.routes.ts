import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { storeController } from '../controllers/store.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '@bogolive/shared';

const router = Router();

router.get('/me', authenticate, userController.getProfile);
router.put('/me', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.put('/me/password', authenticate, validate(changePasswordSchema), userController.changePassword);
router.delete('/me', authenticate, userController.deleteAccount);
router.get('/me/following', authenticate, userController.getFollowing);
router.get('/me/followers', authenticate, userController.getFollowers);
// Requirement #2 — the four profile counts and their lists.
router.get('/me/stats', authenticate, userController.getStats);
router.get('/me/friends', authenticate, userController.getFriends);
router.get('/me/visitors', authenticate, userController.getVisitors);
// Bag / Inventory (#22, #29, §4.0)
router.get('/me/bag', authenticate, storeController.getBag);
router.post('/me/bag/:inventoryId/equip', authenticate, storeController.equip);
// Call Pricing (#72)
router.put('/me/call-price', authenticate, userController.setCallPrice);

// §4.12 Profile completion & security status
router.get('/me/completion', authenticate, userController.getCompletion);
router.get('/me/security', authenticate, userController.getSecurityStatus);

// §4.12 Settings
router.get('/me/settings', authenticate, userController.getSettings);
router.patch('/me/settings', authenticate, userController.updateSettings);

// §4.12 Blacklist
router.get('/me/blacklist', authenticate, userController.getBlacklist);
router.post('/me/blacklist/:targetId', authenticate, userController.toggleBlacklist);
router.delete('/me/blacklist/:targetId', authenticate, userController.toggleBlacklist);

// §4.12 Watch History
router.get('/me/watch-history', authenticate, userController.getWatchHistory);
router.delete('/me/watch-history', authenticate, userController.clearWatchHistory);

// Discover — search users (must be BEFORE /:id)
router.get('/search', authenticate, userController.searchUsers);

// Public profile (optional auth to include isFollowing + record the visit)
router.get('/:id', optionalAuth, userController.getPublicProfile);
router.get('/:id/follow-status', authenticate, userController.followStatus);
router.get('/:id/stats', userController.getStats);
router.get('/:id/following', userController.getFollowing);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/friends', userController.getFriends);
// Visitors are private — the controller rejects anyone but the owner.
router.get('/:id/visitors', authenticate, userController.getVisitors);
router.post('/:id/follow', authenticate, userController.toggleFollow);
router.put('/:id/follow', authenticate, userController.follow);
router.delete('/:id/follow', authenticate, userController.unfollow);

export default router;
