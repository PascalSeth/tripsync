import { Router } from 'express';
import { body } from 'express-validator';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post(
  '/',
  authenticate,
  [
    body('locationId').isUUID().withMessage('Valid location ID required'),
    body('placeType').isIn(['RESTAURANT', 'CAFE', 'BAR', 'HOTEL', 'ATTRACTION', 'SHOPPING', 'OTHER']).withMessage('Invalid place type'),
    body('keywords').optional().notEmpty().withMessage('Keywords cannot be empty'),
    body('maxPrice').optional().isFloat({ min: 0 }).withMessage('Valid max price required'),
    body('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Valid min rating required'),
    body('radius').optional().isFloat({ min: 0 }).withMessage('Valid radius required'),
  ],
  RecommendationController.createRequest
);

router.get('/', authenticate, RecommendationController.getUserRequests);

router.get('/:requestId/places', authenticate, RecommendationController.getRecommendedPlaces);

export const recommendationRoutes = router;