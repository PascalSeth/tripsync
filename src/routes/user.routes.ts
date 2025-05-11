import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.get('/favorites', authenticate, UserController.getFavorites);
router.post('/favorites', authenticate, UserController.addFavorite);

export const userRoutes = router;