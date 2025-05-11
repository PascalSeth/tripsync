import { Router } from 'express';
import { body } from 'express-validator';
import { RideController } from '../controllers/ride.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/types', RideController.getRideTypes);

router.post(
  '/',
  authenticate,
  [
    body('rideTypeId').notEmpty().withMessage('Ride type is required'),
    body('pickupLocationId').notEmpty().withMessage('Pickup location is required'),
    body('dropoffLocationId').notEmpty().withMessage('Dropoff location is required'),
    body('pickupTime').notEmpty().withMessage('Pickup time is required'),
    body('estimatedDistance').isNumeric().withMessage('Valid distance required'),
    body('estimatedDuration').isNumeric().withMessage('Valid duration required'),
    body('estimatedPrice').isNumeric().withMessage('Valid price required'),
  ],
  RideController.requestRide
);

router.get('/history', authenticate, RideController.getRideHistory);
router.get('/:id', authenticate, RideController.getRideDetails);
router.put('/:id/cancel', authenticate, RideController.cancelRide);

export const rideRoutes = router;