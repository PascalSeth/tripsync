import { Router } from 'express';
import { body } from 'express-validator';
import { DriverController } from '../controllers/driver.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', authenticate, DriverController.getProfile);

router.post(
  '/profile',
  authenticate,
  [
    body('licenseNumber').notEmpty().withMessage('License number is required'),
    body('licenseExpiryDate').isISO8601().withMessage('Valid expiry date required'),
    body('vehicleId').optional().isUUID().withMessage('Valid vehicle ID required'),
    body('insuranceInfo').optional().notEmpty().withMessage('Insurance info cannot be empty'),
  ],
  DriverController.createProfile
);

router.put(
  '/profile',
  authenticate,
  [
    body('licenseNumber').optional().notEmpty().withMessage('License number cannot be empty'),
    body('licenseExpiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
    body('vehicleId').optional().isUUID().withMessage('Valid vehicle ID required'),
    body('insuranceInfo').optional().notEmpty().withMessage('Insurance info cannot be empty'),
    body('currentStatus').optional().isIn(['ONLINE', 'OFFLINE', 'ON_RIDE', 'BREAK']).withMessage('Invalid status'),
  ],
  DriverController.updateProfile
);

router.post(
  '/ride-types',
  authenticate,
  [
    body('rideTypeId').isUUID().withMessage('Valid ride type ID required'),
  ],
  DriverController.addRideType
);

router.get('/available-rides', authenticate, DriverController.getAvailableRides);

export const driverRoutes = router;